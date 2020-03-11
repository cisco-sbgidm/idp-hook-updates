terraform {
  backend "gcs" {}
}

provider "google" {
  project = var.gcp_project
  region  = var.gcp_region
}

locals {
  name_prefix       = "${var.env}-${var.base_name}"
  nodejs_runtime    = "nodejs10"
  function_zip_name = "idp-hook-updates.zip"
}

resource "google_storage_bucket" "idp_hook_updates" {
  name     = local.name_prefix
  location = var.gcp_region
}

resource "google_storage_bucket_object" "idp_hook_updates" {
  name   = local.name_prefix
  bucket = google_storage_bucket.idp_hook_updates.name
  source = "${path.module}/../dist/${local.function_zip_name}"
}

resource "google_redis_instance" "idp_hook_updates" {
  name           = local.name_prefix
  display_name   = local.name_prefix
  memory_size_gb = 1
  region         = var.gcp_region
}

resource "google_vpc_access_connector" "idp_hook_updates" {
  name          = "idp-hook-updates"
  region        = var.gcp_region
  ip_cidr_range = "10.8.0.0/28"
  network       = "default"
}

resource "google_cloudfunctions_function" "idp_hook_updates" {
  name        = local.name_prefix
  description = local.name_prefix
  runtime     = local.nodejs_runtime

  source_archive_bucket = google_storage_bucket.idp_hook_updates.name
  source_archive_object = google_storage_bucket_object.idp_hook_updates.name
  trigger_http          = true
  entry_point           = "oktaDuoGcp"
  vpc_connector         = google_vpc_access_connector.idp_hook_updates.id

  environment_variables = {
    OKTA_ENDPOINT        = var.okta_endpoint
    DUO_ENDPOINT         = var.duo_endpoint
    SM_SECRETS_ID        = local.name_prefix
    GCP_PROJECT          = var.gcp_project
    REDIS_CACHE_HOSTNAME = google_redis_instance.idp_hook_updates.host
    REDIS_CACHE_PORT     = google_redis_instance.idp_hook_updates.port
  }
}

data "google_iam_policy" "admin" {
  binding {
    role = "roles/secretmanager.secretAccessor"
    members = [
      "serviceAccount:${var.gcp_project}@appspot.gserviceaccount.com",
    ]
  }
}

resource "google_secret_manager_secret_iam_policy" "idp_hook_updates" {
  provider    = google-beta
  project     = var.gcp_project
  secret_id   = local.name_prefix
  policy_data = data.google_iam_policy.admin.policy_data
}

# Data returned by this module.
output "hook-endpoint" {
  value = google_cloudfunctions_function.idp_hook_updates.https_trigger_url
}
