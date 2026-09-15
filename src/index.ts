import Fastify from "fastify";

const port = Number(process.env.PORT ?? 3000);
const app = Fastify({ logger: true });

try {
  await app.listen({ port });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
