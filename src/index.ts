import "dotenv/config";
import Fastify, {
  type FastifyInstance,
  type FastifyRequest,
  type FastifyReply,
} from "fastify";
import { createHmac } from "node:crypto";

const port: number = Number(process.env.PORT ?? 3000);
const app: FastifyInstance = Fastify({ logger: true });
app.addContentTypeParser(
  "application/json",
  { parseAs: "buffer" },
  function (req, body, done) {
    done(null, body);
  },
);

app.post("/webhooks/github", (req: FastifyRequest, res: FastifyReply) => {
  const event = req.headers["x-github-event"];
  const delivery = req.headers["x-github-delivery"];
  const body = req.body;
  app.log.info({ event, delivery, body });
  return res.status(200).send({ ok: true });
});

try {
  await app.listen({ port });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
