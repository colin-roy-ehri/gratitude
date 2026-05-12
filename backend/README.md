# Gratitude backend

Fastify + TypeScript backend for the Gratitude mutual-aid network. Receives signed structured messages from the on-device tier, runs deterministic matching, relays sealed-box encrypted contact shares, and serves a Gemma-4-generated community pulse. Persists to Firestore. Deploys as a single container image to a small EU Compute Engine VM.

For the project overview, the on-device tier, and the wire format, see the [top-level README](../README.md).

## Privacy boundaries, made visible

The Firestore schema is the privacy claim made auditable: anything not in a column can't be queried, exported, or subpoenaed. The server is structurally incapable of seeing:

- **User names or phone numbers.** Not collected, not stored, not part of any payload.
- **Free-form message text.** The wire format has no message-content field for anonymized posts. The optional `text` message type carries plaintext content for direct sender-to-recipient delivery only; it's not used by the community-* lifecycle.
- **Contact info between matched parties.** Stored as `encryptedPayload` (libsodium sealed box, encrypted on-device to the recipient's ephemeral public key). The server can relay it but cannot read it.
- **Stable identity.** Every anonymized post is signed with a fresh Ed25519 keypair generated on-device. The server sees public keys but has no mechanism to link them to a person.

The server **can** see: approximate location (lat/lng truncated to two decimal places on-device, ≈ 1.1 km), message timing, UNSPSC categories, public-key reuse within a session, and the implicit social graph of matches. This is the honest cost of running deterministic geo + categorical matching server-side.

User deletion is supported and cryptographically enforced — see [`POST /v1/records/delete`](#delete-a-record) below.

## Stack

- **Runtime:** Fastify 5 on Node.js 22, TypeScript ESM
- **Persistence:** Firestore (Native mode), single region
- **LLM:** Gemma 4 via Vertex AI Model-as-a-Service (`gemma-4-26b-a4b-it-maas`)
- **Validation:** Zod schemas on every route
- **Container:** Docker, built by Cloud Build, pushed to Artifact Registry
- **Deployment:** Single Compute Engine VM (e2-standard-2, europe-west4) running the container with `--restart unless-stopped`

## Endpoints

All routes return JSON. Validation errors return `400` with the Zod issue list. Authorization for state-changing requests is by Ed25519 signature over a canonical message (see [Signed deletion](#delete-a-record)); there is no session, cookie, or bearer token.

### `GET /health`

Liveness probe. Returns `{ ok: true }`.

### `POST /v1/messages/submit`

Stores a signed message. The `searchable` block is extracted from `payload` and indexed; the original `payload` is preserved for signature verification on later operations.

```json
{
  "messageType": "anonymized",
  "publicKey": "base64-ed25519-pubkey",
  "signature": "base64-ed25519-signature",
  "payload": {
    "unspscCode": 50202700,
    "latitude": 39.06,
    "longitude": -108.55,
    "startTimestamp": 1762560000,
    "endTimestamp": 1763164800
  }
}
```

`messageType` is one of:

- `anonymized` — a NEED or OFFER post. No recipient. Visible to the matching engine.
- `text` — direct plaintext message; requires `recipientPublicKey`. Pushed to recipient inbox. Not used by community-* flow.
- `public_contact_unencrypted` — reserved for opt-in public contact details. Not used by the current lifecycle.

Returns `{ messageId, createdAt, searchable }`.

### `GET /v1/messages/poll?publicKey=<key>&since=<iso>`

Inbox poll for a single public key. Returns `{ messages }` — pending matches, decrypted contact deliveries (the ciphertext is delivered as-is; the client decrypts), and any plaintext sent directly.

### `POST /v1/connect/match`

Runs deterministic matching for one or more of the caller's public keys. Cheap — pure function over Firestore reads, no LLM. Safe to call often (the on-device skills do it after every post).

```json
{ "publicKeys": ["pubkey-a", "pubkey-b"] }
```

For each match, a `match` inbox notification is pushed to **both** parties. Match deduplication is by `matchId` (the two message IDs sorted and joined).

Returns:

```json
{
  "keyCount": 2,
  "myMessageCount": 6,
  "globalMessageCount": 142,
  "matches": [
    {
      "leftMessageId": "...",
      "rightMessageId": "...",
      "unspscCode": 50202700,
      "score": 0.92,
      "reason": "exact UNSPSC match on 50202700, overlapping date range, close geographic distance (score 0.92)"
    }
  ]
}
```

#### Scoring rules (deterministic)

| Signal | Bonus |
|---|---|
| Exact UNSPSC code match (both 8-digit) | +0.6 |
| Family-level UNSPSC match (one side ends `00`, family digits match) | +0.4 |
| Class-level UNSPSC match (one side ends `0000`, class digits match) | +0.2 |
| Date range overlap | +0.2 |
| ≤ 5 km apart | +0.2 |
| ≤ 20 km apart | +0.1 |
| ≤ 50 km apart | +0.05 |

Threshold for a match: total score ≥ 0.4. Top 50 returned, sorted by score descending. Hierarchical UNSPSC matching only fires when one side is a generic ancestor of the other — two unrelated specific codes do not match.

### `POST /v1/connect/pulse`

The only Gemma-calling endpoint. Aggregates the last seven days of community activity (connection count + top active UNSPSCs) **excluding the caller's own posts**, and asks Gemma 4 (`gemma-4-26b-a4b-it-maas` via Vertex AI) to write a 2–3-sentence community update.

```json
{ "publicKeys": ["pubkey-a"] }
```

Returns `{ communityActivitySummary: "..." }`.

The prompt is intentionally short and free of any PII — only aggregate counts and UNSPSC codes are sent to Vertex. See [`src/services/gemmaService.ts`](src/services/gemmaService.ts) for the exact prompt.

### `POST /v1/contact/share`

Relays an encrypted contact payload. The plaintext contact details never reach the server — the on-device `community-connect` skill libsodium-sealed-boxes them to the recipient's public key before sending.

```json
{
  "senderPublicKey": "...",
  "recipientPublicKey": "...",
  "encryptedPayload": "base64-ciphertext",
  "signature": "..."
}
```

The server enforces a **reachability check**: the recipient must have at least one `anonymized` message on file. This prevents using `/v1/contact/share` as an arbitrary push channel to keys that never opted in. Returns `403 { error: "recipient not reachable" }` otherwise.

On success the encrypted blob is stored in the `contacts` collection and a `contact_info` inbox notification is pushed to the recipient. Returns `{ contactRecordId, createdAt }`.

### `PATCH /v1/inbox/messages/:id/read`

Marks an inbox notification as read. Returns `{ ok: true }`.

> **Note:** This endpoint does not currently verify the caller owns the inbox item. It's safe in practice because inbox IDs are opaque Firestore document IDs, but a signature check is a reasonable hardening before any real-world deployment.

### `POST /v1/records/delete`

Signed deletion of a stored message or contact relay. The signature must cover a canonical deletion message that includes a fresh timestamp, so old signatures cannot be replayed.

```json
{
  "recordType": "message",
  "recordId": "abc123",
  "timestamp": 1762565100,
  "signature": "base64-ed25519-signature"
}
```

- For `message`: signature must verify against the original signing public key of that message.
- For `contact`: signature must verify against the original `senderPublicKey`.

Stale timestamps (outside the freshness window) are rejected as `403 unauthorized`. Successful deletion also clears any inbox notifications derived from the record (text messages, contact-info notifications). Returns `{ ok: true }`.

This is the user's right-to-be-forgotten primitive. Because there is no account, deletion is by cryptographic proof-of-key-ownership, not by user ID.

### `POST /v1/dev/simulate`

Available only when `ENABLE_DEV_ROUTES=true`. Injects a sample gratitude-story inbox notification for a given recipient public key. For demo seeding; never enable in production.

## Firestore schema

Three collections. Field names match the code in [`src/repositories/messageRepository.ts`](src/repositories/messageRepository.ts).

### `messages`

The primary store. One document per submitted message.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Firestore document ID |
| `messageType` | `'anonymized' \| 'text' \| 'public_contact_unencrypted'` | |
| `publicKey` | string | Base64 Ed25519 public key. Fresh per `anonymized` post — no persistent identity. |
| `signature` | string | Base64 Ed25519 signature over the canonical payload |
| `payload` | object | Original JSON exactly as submitted (preserved for signature re-verification) |
| `searchable.unspscCode` | number | Extracted from `payload` for indexed query |
| `searchable.location.latitude` | number | Lat with 2-dp precision (rounded on-device) |
| `searchable.location.longitude` | number | Lng with 2-dp precision (rounded on-device) |
| `searchable.dateRange.startTimestamp` | number | Unix seconds |
| `searchable.dateRange.endTimestamp` | number | Unix seconds |
| `searchable.cronSchedule` | string | Optional recurrence |
| `recipientPublicKey` | string | Optional, only for `text` messages |
| `createdAt` | timestamp | Server-set |

**Notable absences:** no `userId`, no `email`, no `phone`, no `name`, no `address`, no free-form `content` field on `anonymized` messages, no IP log, no fingerprint, no device ID.

### `inbox`

Per-recipient notification stream. One document per pending event.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Firestore document ID |
| `recipientPublicKey` | string | The only address the server uses |
| `messageType` | `'match' \| 'contact_info' \| 'text' \| 'story'` | |
| `content` | string | Short human-readable summary (e.g. `"You have a new match!"`); never contains contact details |
| `data` | object | Type-specific payload — for `contact_info` this is the ciphertext blob; for `match` this is the match metadata |
| `read` | bool | Set by `PATCH /v1/inbox/messages/:id/read` |
| `createdAt` | timestamp | |

### `contacts`

Encrypted contact-share relay. One document per `/v1/contact/share` call.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Firestore document ID |
| `senderPublicKey` | string | |
| `recipientPublicKey` | string | |
| `encryptedPayload` | string | Base64 libsodium sealed box. **The server cannot decrypt this.** |
| `signature` | string | Signature over the encrypted payload |
| `createdAt` | timestamp | |

## Gemma 4 integration

Single integration point. The backend uses Gemma 4 26B via Vertex AI MaaS — chosen for context window and reasoning headroom, since the on-device E-series can't summarize across an arbitrary community window.

```typescript
const vertexAI = new VertexAI({
  project: requireProjectId(),
  location: config.vertexAiLocation,   // default 'global'
  apiEndpoint: config.vertexAiApiEndpoint,
});
const model = vertexAI.getGenerativeModel({
  model: config.vertexAiModel,         // default 'gemma-4-26b-a4b-it-maas'
});
```

The prompt for `generateCommunityReport` (full source: [`src/services/gemmaService.ts`](src/services/gemmaService.ts)) takes only two facts: the integer count of new connections in the last seven days, and the top active UNSPSC codes. No public keys, no message IDs, no payloads. If Vertex fails, the route degrades gracefully — the deterministic matching path is unaffected.

A second method, `summarizeMatches`, is implemented but not currently wired to a route. Reserved for a future "weekly digest" job.

## Local development

```bash
cd backend
npm install
cp .env.example .env  # then set GOOGLE_CLOUD_PROJECT
gcloud auth application-default login
npm run dev           # tsx watch, http://localhost:3000
```

Required env:

| Var | Default | Notes |
|---|---|---|
| `GOOGLE_CLOUD_PROJECT` | — | Required for Firestore + Vertex |
| `VERTEX_AI_LOCATION` | `global` | |
| `VERTEX_AI_MODEL` | `gemma-4-26b-a4b-it-maas` | |
| `VERTEX_AI_API_ENDPOINT` | unset | Set to `aiplatform.googleapis.com` for the global Vertex endpoint |
| `PORT` | `3000` | |
| `CORS_ORIGIN` | `https://appassets.androidplatform.net,http://localhost:5173,https://localhost` | The Android WebView origin is what the community-* skills hit |
| `FIRESTORE_COLLECTION_MESSAGES` / `_INBOX` / `_CONTACTS` | `messages` / `inbox` / `contacts` | Override for ephemeral test environments |
| `ENABLE_DEV_ROUTES` | `false` | Enables `/v1/dev/simulate` |

Type-check without building: `npm run type-check`.

## Build and deploy to GCP

The hackathon deployment is a single Compute Engine VM running the container image. Production could use local edge devices with Gemma 4 running on the central server; the container is portable.

### 1. Build the container

```bash
cd backend
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_AR_IMAGE=europe-west4-docker.pkg.dev/YOUR_PROJECT/gratitude/gratitude-backend
```

### 2. Deploy the VM

```bash
cd backend/deploy
bash deploy-vm.sh YOUR_PROJECT europe-west4 europe-west4-a
```

This script enables the required Google Cloud APIs, creates the Artifact Registry repo (if needed), builds and pushes the image, provisions an e2-standard-2 Debian 12 VM with a startup script that pulls and runs the container, and opens port 3000 on tag `http-server`.

Suggested EU regions (keep Firestore and VM in the same region for simpler GDPR posture):

- `europe-west4` (Netherlands)
- `europe-west1` (Belgium)
- `europe-west3` (Frankfurt)

### Cost notes ($40 hackathon ceiling)

- e2-standard-2 is sufficient for demo traffic
- Stop the VM when not demoing (`gcloud compute instances stop`)
- Vertex AI MaaS billing is per request; the `/v1/connect/pulse` prompt is short and infrequent
- Set a Cloud Billing budget alert at $30 to leave a buffer

## What's in this directory

| Path | What |
|---|---|
| `src/index.ts` | App entry, CORS, route registration |
| `src/config.ts` | Env var parsing + defaults |
| `src/routes/messages.ts` | All `/v1/*` routes |
| `src/routes/health.ts` | `/health` |
| `src/repositories/messageRepository.ts` | Firestore data access (the privacy boundary in code) |
| `src/services/matchService.ts` | Deterministic UNSPSC + geo + time matching |
| `src/services/gemmaService.ts` | Vertex AI Gemma 4 wrapper, prompts |
| `src/services/signing.ts` | Ed25519 signature verification, canonical messages, freshness check |
| `Dockerfile`, `cloudbuild.yaml`, `deploy/` | Container build + VM deploy |
