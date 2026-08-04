locals {
  required_apis = toset([
    "artifactregistry.googleapis.com",
    "billingbudgets.googleapis.com",
    "cloudbuild.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "storage.googleapis.com",
  ])

  runtime_secrets = {
    GEMINI_API_KEY        = "gemini-api-key"
    CLERK_SECRET_KEY      = "clerk-secret-key"
    STRIPE_SECRET_KEY     = "stripe-secret-key"
    STRIPE_WEBHOOK_SECRET = "stripe-webhook-secret"
    DATABASE_URL          = "database-url"
  }

  public_environment = {
    GEMINI_MODEL                      = "gemini-flash-latest"
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = var.clerk_publishable_key
    NEXT_PUBLIC_BASE_URL              = var.next_public_base_url
    STRIPE_PRICE_WEEKLY               = var.stripe_price_weekly
    STRIPE_PRICE_MONTHLY              = var.stripe_price_monthly
    STRIPE_PRICE_YEARLY               = var.stripe_price_yearly
  }
}

data "google_project" "current" {
  project_id = var.project_id
}

resource "google_billing_budget" "project_alert" {
  billing_account = var.billing_account_id
  display_name    = "Fit Spark monthly cost alert"

  budget_filter {
    projects        = ["projects/${data.google_project.current.number}"]
    calendar_period = "MONTH"
  }

  amount {
    specified_amount {
      units = "1"
    }
  }

  threshold_rules {
    threshold_percent = 0.25
  }

  threshold_rules {
    threshold_percent = 0.5
  }

  threshold_rules {
    threshold_percent = 0.75
  }

  threshold_rules {
    threshold_percent = 1
  }

  depends_on = [google_project_service.required]
}

resource "google_project_service" "required" {
  for_each = local.required_apis

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "app" {
  project       = var.project_id
  location      = var.region
  repository_id = var.artifact_repository
  description   = "Fit Spark container images"
  format        = "DOCKER"

  cleanup_policy_dry_run = false

  cleanup_policies {
    id     = "delete-old-images"
    action = "DELETE"
    condition {
      tag_state  = "ANY"
      older_than = "604800s"
    }
  }

  cleanup_policies {
    id     = "keep-recent-images"
    action = "KEEP"
    most_recent_versions {
      keep_count = 2
    }
  }

  depends_on = [google_project_service.required]
}

resource "google_service_account" "runtime" {
  project      = var.project_id
  account_id   = "fit-spark-runtime"
  display_name = "Fit Spark Cloud Run runtime"
}

resource "google_service_account" "build" {
  project      = var.project_id
  account_id   = "fit-spark-build"
  display_name = "Fit Spark manual Cloud Build"
}

resource "google_storage_bucket" "build_source" {
  project                     = var.project_id
  name                        = "${var.project_id}-fit-spark-build-source"
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = true

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age = 1
    }
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret" "runtime" {
  for_each = local.runtime_secrets

  project   = var.project_id
  secret_id = each.value

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_iam_member" "runtime_access" {
  for_each = google_secret_manager_secret.runtime

  project   = var.project_id
  secret_id = each.value.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_artifact_registry_repository_iam_member" "build_writer" {
  project    = var.project_id
  location   = google_artifact_registry_repository.app.location
  repository = google_artifact_registry_repository.app.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.build.email}"
}

resource "google_project_iam_member" "build_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.build.email}"
}

resource "google_storage_bucket_iam_member" "build_source_reader" {
  bucket = google_storage_bucket.build_source.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.build.email}"
}

resource "google_storage_bucket_iam_member" "operator_source_writer" {
  bucket = google_storage_bucket.build_source.name
  role   = "roles/storage.objectCreator"
  member = "user:${var.operator_email}"
}

resource "google_service_account_iam_member" "operator_uses_build_identity" {
  service_account_id = google_service_account.build.name
  role               = "roles/iam.serviceAccountUser"
  member             = "user:${var.operator_email}"
}

resource "google_project_iam_member" "operator_build_editor" {
  project = var.project_id
  role    = "roles/cloudbuild.builds.editor"
  member  = "user:${var.operator_email}"
}

resource "google_cloud_run_v2_service" "app" {
  count = var.deploy_cloud_run ? 1 : 0

  project             = var.project_id
  name                = var.service_name
  location            = var.region
  deletion_protection = false
  ingress             = "INGRESS_TRAFFIC_ALL"

  template {
    service_account                  = google_service_account.runtime.email
    max_instance_request_concurrency = 80

    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }

    containers {
      image = var.container_image

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle          = true
        startup_cpu_boost = false
      }

      ports {
        container_port = 3000
      }

      dynamic "env" {
        for_each = local.public_environment
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = local.runtime_secrets
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.runtime[env.key].secret_id
              version = "latest"
            }
          }
        }
      }

      startup_probe {
        initial_delay_seconds = 0
        timeout_seconds       = 1
        period_seconds        = 3
        failure_threshold     = 20
        tcp_socket {
          port = 3000
        }
      }
    }
  }

  lifecycle {
    precondition {
      condition     = var.container_image != ""
      error_message = "container_image is required when deploy_cloud_run is true."
    }
  }

  depends_on = [
    google_project_service.required,
    google_secret_manager_secret_iam_member.runtime_access,
  ]
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  count = var.deploy_cloud_run && var.allow_public_access ? 1 : 0

  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.app[0].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
