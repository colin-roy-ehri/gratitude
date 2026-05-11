#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/opt/gratitude-backend
ENV_FILE=${APP_DIR}/.env
IMAGE_URI="$1"

if [ -z "${IMAGE_URI}" ]; then
  echo "Usage: compute-startup.sh <artifact-registry-image-uri>"
  exit 1
fi

mkdir -p ${APP_DIR}

if [ ! -f ${ENV_FILE} ]; then
  cat <<EOF > ${ENV_FILE}
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
FIRESTORE_COLLECTION_MESSAGES=messages
FIRESTORE_COLLECTION_INBOX=inbox
FIRESTORE_COLLECTION_CONTACTS=contacts
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=gemma3:latest
ENABLE_DEV_ROUTES=false
EOF
fi

apt-get update
apt-get install -y docker.io
systemctl enable docker
systemctl start docker

docker pull ${IMAGE_URI}

docker rm -f gratitude-backend || true

docker run -d \
  --name gratitude-backend \
  --restart unless-stopped \
  --env-file ${ENV_FILE} \
  -p 3000:3000 \
  ${IMAGE_URI}
