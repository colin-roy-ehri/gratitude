import { FastifyInstance } from 'fastify';

export async function registerHealthRoute(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({
    ok: true,
    service: 'gratitude-backend',
    timestamp: new Date().toISOString(),
  }));
}
