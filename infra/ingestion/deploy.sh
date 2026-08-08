#!/bin/bash
set -e
echo "Deploying FitSpark RAG Ingestion..."
gcloud builds submit --config infra/ingestion/cloudbuild.yaml .
