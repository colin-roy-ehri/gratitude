# Gratitude Backend (Hackathon Fast Track)

Backend API for anonymized mutual aid messages, connect-time matching, and encrypted contact relay.

## Stack

- Fastify + TypeScript
- Firestore (persistent storage)
- Optional untuned Gemma via Ollama endpoint
- Docker image build with Cloud Build + Artifact Registry
- Single Compute Engine VM deployment (EU region)

## Privacy model implemented

- Message payloads are stored as signed JSON and treated as anonymized
- Contact payloads are encrypted for recipient public key and relayed server-side
- No Pub/Sub dependency
- Matching runs when client connects and sends its public key list
- No automatic expiration on anonymized messages

## Local development

1. Install dependencies:

```bash
cd backend
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Set project and credentials:

- Set GOOGLE_CLOUD_PROJECT in .env
- Use ADC via `gcloud auth application-default login` or set GOOGLE_APPLICATION_CREDENTIALS

4. Run API:

```bash
npm run dev
```

Server listens on http://localhost:3000.

## API endpoints

### GET /health
Health check.

### POST /v1/messages/submit
Stores signed message JSON and searchable parsed fields.

Request body:

```json
{
  "messageType": "anonymized",
  "publicKey": "base64-public-key",
  "signature": "base64-signature",
  "payload": {
    "unspscCode": 48101601,
    "latitude": 52.52,
    "longitude": 13.405,
    "startTimestamp": 1775155200,
    "endTimestamp": 1775760000,
    "cronSchedule": "0 9 * * *"
  }
}
```

### GET /v1/messages/poll?publicKey=<key>&since=<iso>
Returns inbox messages for the recipient public key.

### POST /v1/connect/match
Runs deterministic matching using the public key list. Fast — safe to call often.
Pushes a `match` inbox notification to both parties for every new match.

Request body:

```json
{
  "publicKeys": ["pub-key-1", "pub-key-2"]
}
```

Returns: `{ keyCount, myMessageCount, globalMessageCount, matches }`.

### POST /v1/connect/pulse
Generates a Gemma-written welfare summary for the community over the last 7 days.

Request body:

```json
{
  "publicKeys": ["pub-key-1", "pub-key-2"]
}
```

Returns: `{ communityActivitySummary }`.

### POST /v1/contact/share
Relays encrypted contact payload and pushes inbox event to recipient.

Request body:

```json
{
  "senderPublicKey": "sender-key",
  "recipientPublicKey": "recipient-key",
  "encryptedPayload": "base64-ciphertext",
  "signature": "base64-signature"
}
```

### POST /v1/dev/simulate
Available only if ENABLE_DEV_ROUTES=true.
Injects a sample gratitude story into a recipient inbox.

## Firestore schema

### messages collection

- id
- messageType
- publicKey
- signature
- payload (original json)
- searchable.unspscCode
- searchable.location.latitude
- searchable.location.longitude
- searchable.dateRange.startTimestamp
- searchable.dateRange.endTimestamp
- searchable.cronSchedule
- recipientPublicKey (optional)
- createdAt

### inbox collection

- id
- recipientPublicKey
- messageType
- content
- data
- createdAt

### contacts collection

- id
- senderPublicKey
- recipientPublicKey
- encryptedPayload
- signature
- createdAt

## Build and deploy to GCP (single EU VM)

### 1) Build container in Artifact Registry

```bash
cd backend
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_AR_IMAGE=europe-west4-docker.pkg.dev/YOUR_PROJECT/gratitude/gratitude-backend
```

### 2) Create VM and run container

```bash
cd backend/deploy
bash deploy-vm.sh YOUR_PROJECT europe-west4 europe-west4-a
```

## Cost notes for $40 hackathon ceiling

- Use e2-standard-2 VM first
- Keep Ollama optional, or run small model variant
- Stop VM when not demoing
- Set budget alert in Billing > Budgets

## Suggested EU regions

- europe-west4 (Netherlands)
- europe-west1 (Belgium)
- europe-west3 (Frankfurt)

Choose one region and keep Firestore and VM there for simpler GDPR posture.
