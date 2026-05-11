import admin from 'firebase-admin';
import { requireProjectId } from './config.js';

let initialized = false;

export function getFirestore(): FirebaseFirestore.Firestore {
  if (!initialized) {
    admin.initializeApp({
      projectId: requireProjectId(),
    });
    admin.firestore().settings({ ignoreUndefinedProperties: true });
    initialized = true;
  }

  return admin.firestore();
}
