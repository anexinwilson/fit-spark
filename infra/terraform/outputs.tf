output "artifact_image_base_url" {
  description = "Base URL used to tag Fit Spark images."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app.repository_id}/fit-spark"
}

output "build_service_account" {
  description = "Least-privilege service account used by manual Cloud Build submissions."
  value       = google_service_account.build.email
}

output "build_source_bucket" {
  description = "Short-lived staging bucket used for manual Cloud Build source uploads."
  value       = google_storage_bucket.build_source.url
}

output "runtime_secret_names" {
  description = "Secret Manager containers to populate outside Terraform."
  value       = local.runtime_secrets
}

output "cloud_run_url" {
  description = "Cloud Run URL after deploy_cloud_run is enabled."
  value       = var.deploy_cloud_run ? google_cloud_run_v2_service.app[0].uri : null
}

output "rag_job_name" {
  description = "On-demand Cloud Run Job used to rebuild the Pinecone exercise namespace."
  value       = var.enable_rag_job ? google_cloud_run_v2_job.rag_ingestion[0].name : null
}

output "rag_image_bucket" {
  description = "Public GCS bucket serving the exercise catalog images."
  value       = google_storage_bucket.rag_images.name
}
