locals {
  required_apis = toset([
    "cloudresourcemanager.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "storage.googleapis.com",
  ])

  runtime_secrets = {
    FITSPARK_RUNTIME_CONFIG_JSON = "fitspark-runtime-config"
  }
}

data "google_project" "current" {
  project_id = var.project_id
}

resource "google_project_service" "required" {
  for_each = local.required_apis

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

data "google_service_account" "runtime" {
  project    = var.project_id
  account_id = "fit-spark-runtime"
}

data "google_secret_manager_secret" "runtime" {
  for_each  = local.runtime_secrets
  project   = var.project_id
  secret_id = each.value
}

resource "google_storage_bucket" "rag_images" {
  project                     = var.project_id
  name                        = "${var.project_id}-${var.rag_image_bucket_suffix}"
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "inherited"
  force_destroy               = true

  depends_on = [google_project_service.required]
}

resource "google_storage_bucket_iam_member" "rag_images_public_reader" {
  bucket = google_storage_bucket.rag_images.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

resource "google_storage_bucket_iam_member" "rag_images_runtime_writer" {
  bucket = google_storage_bucket.rag_images.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${data.google_service_account.runtime.email}"
}

resource "google_cloud_run_v2_job" "rag_ingestion" {
  count = var.enable_rag_job ? 1 : 0

  project  = var.project_id
  name     = "fit-spark-rag-indexer"
  location = var.region

  template {
    template {
      service_account = data.google_service_account.runtime.email
      max_retries     = 1
      timeout         = "1800s"

      containers {
        image = var.rag_image

        env {
          name = "FITSPARK_RUNTIME_CONFIG_JSON"
          value_source {
            secret_key_ref {
              secret  = data.google_secret_manager_secret.runtime["FITSPARK_RUNTIME_CONFIG_JSON"].secret_id
              version = "latest"
            }
          }
        }
      }
    }
  }

  lifecycle {
    precondition {
      condition     = var.rag_image != ""
      error_message = "rag_image is required when enable_rag_job is true."
    }
  }

  depends_on = [
    google_storage_bucket_iam_member.rag_images_runtime_writer,
  ]
}
