import "dotenv/config";
import Fastify, {
  type FastifyInstance,
  type FastifyRequest,
  type FastifyReply,
} from "fastify";

const port: number = Number(process.env.PORT ?? 3000);
const app: FastifyInstance = Fastify({ logger: true });

app.post("/webhooks/github", (req: FastifyRequest, res: FastifyReply) => {
  return res.status(200).send({ ok: true });
});

try {
  await app.listen({ port });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
