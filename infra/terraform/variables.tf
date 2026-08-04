variable "project_id" {
  description = "Google Cloud project ID."
  type        = string
}

variable "region" {
  description = "Region for Cloud Run and Artifact Registry."
  type        = string
  default     = "us-central1"
}

variable "operator_email" {
  description = "Google account allowed to submit manual Fit Spark builds."
  type        = string

  validation {
    condition     = can(regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", var.operator_email))
    error_message = "operator_email must be a valid email address."
  }
}

variable "billing_account_id" {
  description = "Billing account ID used for the project-scoped cost alert budget."
  type        = string

  validation {
    condition     = can(regex("^[0-9A-F]{6}-[0-9A-F]{6}-[0-9A-F]{6}$", var.billing_account_id))
    error_message = "billing_account_id must use the XXXXXX-XXXXXX-XXXXXX format."
  }
}

variable "service_name" {
  description = "Cloud Run service name."
  type        = string
  default     = "fit-spark"
}

variable "artifact_repository" {
  description = "Artifact Registry Docker repository name."
  type        = string
  default     = "fit-spark"
}

variable "deploy_cloud_run" {
  description = "Create the Cloud Run service after the first image and secret versions exist."
  type        = bool
  default     = false
}

variable "container_image" {
  description = "Full Artifact Registry image URL, preferably pinned to a commit SHA."
  type        = string
  default     = ""
}

variable "allow_public_access" {
  description = "Allow public HTTP access; Clerk still protects application routes."
  type        = bool
  default     = true
}

variable "clerk_publishable_key" {
  description = "Public Clerk publishable key."
  type        = string
  default     = ""
}

variable "stripe_price_weekly" {
  description = "Public Stripe weekly price ID."
  type        = string
  default     = ""
}

variable "stripe_price_monthly" {
  description = "Public Stripe monthly price ID."
  type        = string
  default     = ""
}

variable "stripe_price_yearly" {
  description = "Public Stripe yearly price ID."
  type        = string
  default     = ""
}

variable "next_public_base_url" {
  description = "Public production URL used in Stripe redirects."
  type        = string
  default     = ""
}
