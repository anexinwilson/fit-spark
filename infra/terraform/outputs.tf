output "artifact_image_base_url" {
  description = "Base URL used to tag Fit Spark images."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app.repository_id}/fit-spark"
}

output "github_workload_identity_provider" {
  description = "Set this as the GCP_WORKLOAD_IDENTITY_PROVIDER GitHub Actions secret."
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "github_service_account" {
  description = "Set this as the GCP_SERVICE_ACCOUNT GitHub Actions secret."
  value       = google_service_account.github_deployer.email
}

output "runtime_secret_names" {
  description = "Secret Manager containers to populate outside Terraform."
  value       = local.runtime_secrets
}

output "cloud_run_url" {
  description = "Cloud Run URL after deploy_cloud_run is enabled."
  value       = var.deploy_cloud_run ? google_cloud_run_v2_service.app[0].uri : null
}
