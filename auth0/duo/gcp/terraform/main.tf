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

module "auth0-duo-idp-hook-updates" {
  source               = "../../../../common/cloud/gcp/terraform/modules/idp-hook-updates"
  gcp_region           = var.gcp_region
  gcp_project          = var.gcp_project
  name_prefix          = local.name_prefix
  function_file_path   = "${path.module}/../dist/idp-hook-updates.zip"
  function_entry_point = "auth0DuoGcp"
  vpc_connector_id     = ""

  function_environment = {
    DUO_ENDPOINT         = var.duo_endpoint
    SM_SECRETS_ID        = local.name_prefix
    GCP_PROJECT          = var.gcp_project
  }
}

# Data returned by this module.
output "hook-endpoint" {
  value = module.auth0-duo-idp-hook-updates.hook-endpoint
}
