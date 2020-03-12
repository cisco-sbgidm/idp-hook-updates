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

module "okta-duo-idp-hook-updates" {
  source               = "../../../../common/cloud/gcp/terraform/modules/idp-hook-updates"
  gcp_region           = var.gcp_region
  gcp_project          = var.gcp_project
  name_prefix          = local.name_prefix
  function_file_path   = "${path.module}/../dist/idp-hook-updates.zip"
  function_entry_point = "oktaDuoGcp"
  vpc_connector_id     = google_vpc_access_connector.idp_hook_updates.id

  function_environment = {
    OKTA_ENDPOINT        = var.okta_endpoint
    DUO_ENDPOINT         = var.duo_endpoint
    SM_SECRETS_ID        = local.name_prefix
    GCP_PROJECT          = var.gcp_project
    REDIS_CACHE_HOSTNAME = google_redis_instance.idp_hook_updates.host
    REDIS_CACHE_PORT     = google_redis_instance.idp_hook_updates.port
  }
}

# Data returned by this module.
output "hook-endpoint" {
  value = module.okta-duo-idp-hook-updates.hook-endpoint
}
