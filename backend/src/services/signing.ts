import { createPublicKey, verify } from 'node:crypto';

const DELETE_SKEW_MS = 5 * 60 * 1000;

function b64ToBuffer(input: string): Buffer | null {
  if (typeof input !== 'string' || input.length === 0) return null;
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  try {
    return Buffer.from(padded, 'base64');
  } catch {
    return null;
  }
}

function rawEd25519PublicKey(publicKeyB64: string) {
  const raw = b64ToBuffer(publicKeyB64);
  if (!raw || raw.length !== 32) return null;
  const x = raw.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  try {
    return createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x }, format: 'jwk' });
  } catch {
    return null;
  }
}

export function verifyEd25519(publicKeyB64: string, message: string, signatureB64: string): boolean {
  const key = rawEd25519PublicKey(publicKeyB64);
  if (!key) return false;
  const sig = b64ToBuffer(signatureB64);
  if (!sig || sig.length !== 64) return false;
  try {
    return verify(null, Buffer.from(message, 'utf8'), key, sig);
  } catch {
    return false;
  }
}

export function isFreshTimestamp(timestampMs: number, nowMs = Date.now()): boolean {
  if (!Number.isFinite(timestampMs)) return false;
  return Math.abs(nowMs - timestampMs) <= DELETE_SKEW_MS;
}

export function deletionMessage(recordType: string, recordId: string, timestampMs: number): string {
  return `DELETE:${recordType}:${recordId}:${timestampMs}`;
}
