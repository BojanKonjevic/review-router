import "dotenv/config";
import "./worker.js";
import Fastify, {
  type FastifyInstance,
  type FastifyRequest,
  type FastifyReply,
} from "fastify";
import { createHmac, timingSafeEqual } from "node:crypto";
import { type PrEventJob, prEvents } from "./queue.js";
import { db } from "./db/index.js";
import { installations } from "./schema.js";

const port: number = Number(process.env.PORT ?? 3000);
const app: FastifyInstance = Fastify({ logger: true });
app.addContentTypeParser(
  "application/json",
  { parseAs: "buffer" },
  function (req, body, done) {
    done(null, body);
  },
);

app.post("/webhooks/github", async (req: FastifyRequest, res: FastifyReply) => {
  const rawBody = req.body as Buffer;
  const event = req.headers["x-github-event"];
  const delivery = req.headers["x-github-delivery"];
  const received = req.headers["x-hub-signature-256"];
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret || typeof received !== "string") {
    return res.code(401).send({ ok: false });
  }
  const expected =
    "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  if (Buffer.byteLength(expected) !== Buffer.byteLength(received)) {
    return res.code(401).send({ ok: false });
  }
  if (timingSafeEqual(Buffer.from(expected), Buffer.from(received))) {
    if (
      (event !== "pull_request" && event !== "installation") ||
      typeof delivery !== "string"
    ) {
      app.log.info({ event, delivery });
      return res.code(200).send({ ok: true });
    }
    const body = JSON.parse(rawBody.toString());
    if (event === "installation") {
      const action = body.action;
      const installId = body.installation.id;
      const account = body.installation.account.login;
      if (action === "created") {
        await db
          .insert(installations)
          .values({ id: installId, account: account, removed: false })
          .onConflictDoUpdate({
            target: installations.id,
            set: {
              account: account,
              removed: false,
            },
          });
      } else if (action === "deleted") {
        await db
          .insert(installations)
          .values({ id: installId, account: account, removed: true })
          .onConflictDoUpdate({
            target: installations.id,
            set: {
              account: account,
              removed: true,
            },
          });
      }
      return res.code(200).send({ ok: true });
    }

    const prEventJob: PrEventJob = {
      deliveryId: delivery,
      event: event,
      repo: body.repository.full_name,
      number: body.pull_request.number,
      title: body.pull_request.title,
      action: body.action,
      body: body.pull_request.body,
    };
    await prEvents.add("pr-opened", prEventJob, {
      jobId: prEventJob.deliveryId,
    });
    app.log.info({ event, delivery, prEventJob });
    return res.code(200).send({ ok: true });
  } else {
    return res.code(401).send({ ok: false });
  }
});

try {
  await app.listen({ port });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
