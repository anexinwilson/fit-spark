$ErrorActionPreference = "Stop"
Write-Host "Deploying FitSpark App..."
$PROJECT_ID = gcloud config get-value project
gcloud builds submit --config infra/app/cloudbuild.yaml --substitutions="_IMAGE_URI=us-central1-docker.pkg.dev/$PROJECT_ID/fit-spark/fit-spark:latest" .
