#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="$1"
REGION="${2:-europe-west4}"
ZONE="${3:-europe-west4-a}"
INSTANCE="${4:-gratitude-backend-vm}"
REPO="${5:-gratitude}"
IMAGE_NAME="${6:-gratitude-backend}"

if [ -z "${PROJECT_ID}" ]; then
  echo "Usage: deploy-vm.sh <project-id> [region] [zone] [instance] [repo] [image-name]"
  exit 1
fi

AR_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE_NAME}:latest"

gcloud config set project ${PROJECT_ID}
gcloud services enable artifactregistry.googleapis.com cloudbuild.googleapis.com compute.googleapis.com firestore.googleapis.com

gcloud artifacts repositories create ${REPO} \
  --repository-format=docker \
  --location=${REGION} \
  --description="Gratitude backend images" || true

gcloud builds submit --config=cloudbuild.yaml --substitutions=_AR_IMAGE=${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE_NAME} .

gcloud compute instances create ${INSTANCE} \
  --zone=${ZONE} \
  --machine-type=e2-standard-2 \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --scopes=https://www.googleapis.com/auth/cloud-platform \
  --tags=http-server,https-server \
  --metadata=startup-script="#!/bin/bash\napt-get update\napt-get install -y docker.io\nsystemctl enable docker\nsystemctl start docker\ngcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet\ndocker pull ${AR_IMAGE}\ndocker rm -f gratitude-backend || true\ndocker run -d --name gratitude-backend --restart unless-stopped -p 3000:3000 ${AR_IMAGE}" || true

gcloud compute firewall-rules create gratitude-backend-3000 \
  --allow tcp:3000 \
  --target-tags=http-server \
  --description="Allow backend API traffic" || true

echo "Deployment kicked off. VM: ${INSTANCE}, Zone: ${ZONE}, Image: ${AR_IMAGE}"
