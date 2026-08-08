$ErrorActionPreference = "Stop"
Write-Host "Deploying FitSpark RAG Ingestion..."
gcloud builds submit --config infra/ingestion/cloudbuild.yaml .
