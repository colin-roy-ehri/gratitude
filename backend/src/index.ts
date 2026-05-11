import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { registerHealthRoute } from './routes/health.js';
import { registerMessageRoutes } from './routes/messages.js';

async function buildServer() {
  const app = Fastify({ logger: true });

  // Parse CORS_ORIGIN: `*` means reflect any origin; otherwise comma-separated
  // list of allowed origins.
  const raw = config.corsOrigin.trim();
  const origin: boolean | string | string[] =
    raw === '*'
      ? true
      : raw.includes(',')
        ? raw.split(',').map((s) => s.trim()).filter(Boolean)
        : raw;

  await app.register(cors, {
    origin,
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  await registerHealthRoute(app);
  await registerMessageRoutes(app);

  return app;
}

async function main() {
  const app = await buildServer();

  try {
    await app.listen({
      host: config.host,
      port: config.port,
    });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
