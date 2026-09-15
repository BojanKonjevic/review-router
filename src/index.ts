import "dotenv/config";
import Fastify, { FastifyInstance } from "fastify";

const port: number = Number(process.env.PORT ?? 3000);
const app: FastifyInstance = Fastify({ logger: true });

try {
  await app.listen({ port });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
