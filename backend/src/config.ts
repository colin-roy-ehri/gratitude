import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  // Comma-separated list of allowed CORS origins, OR `*` for any.
  // Default covers the Android WebView (gallery community-offer/need skills),
  // gratitude's vite dev server, and the Capacitor https://localhost shell.
  corsOrigin:
    process.env.CORS_ORIGIN ??
    'https://appassets.androidplatform.net,http://localhost:5173,https://localhost',
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  messagesCollection: process.env.FIRESTORE_COLLECTION_MESSAGES ?? 'messages',
  inboxCollection: process.env.FIRESTORE_COLLECTION_INBOX ?? 'inbox',
  contactsCollection: process.env.FIRESTORE_COLLECTION_CONTACTS ?? 'contacts',
  vertexAiLocation: process.env.VERTEX_AI_LOCATION ?? 'global',
  vertexAiModel: process.env.VERTEX_AI_MODEL ?? 'gemma-4-26b-a4b-it-maas',
  vertexAiApiEndpoint: process.env.VERTEX_AI_API_ENDPOINT, // e.g. 'aiplatform.googleapis.com' for the global endpoint
  enableDevRoutes: process.env.ENABLE_DEV_ROUTES === 'true',
};

export function requireProjectId(): string {
  if (!config.projectId) {
    throw new Error('Missing GOOGLE_CLOUD_PROJECT.');
  }
  return config.projectId;
}
