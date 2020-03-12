locals {
  nodejs_runtime    = "nodejs10"
  function_zip_name = "idp-hook-updates.zip"
}

resource "google_storage_bucket" "idp_hook_updates" {
  name     = var.name_prefix
  location = var.gcp_region
}

resource "google_storage_bucket_object" "idp_hook_updates" {
  name   = var.name_prefix
  bucket = google_storage_bucket.idp_hook_updates.name
  source = var.function_file_path
}

resource "google_cloudfunctions_function" "idp_hook_updates" {
  name        = var.name_prefix
  description = var.name_prefix
  runtime     = local.nodejs_runtime

  source_archive_bucket = google_storage_bucket.idp_hook_updates.name
  source_archive_object = google_storage_bucket_object.idp_hook_updates.name
  trigger_http          = true
  entry_point           = var.function_entry_point
  vpc_connector         = var.vpc_connector_id
  environment_variables = var.function_environment
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
  secret_id   = var.name_prefix
  policy_data = data.google_iam_policy.admin.policy_data
}

# Data returned by this module.
output "hook-endpoint" {
  value = google_cloudfunctions_function.idp_hook_updates.https_trigger_url
}
