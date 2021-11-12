terraform {
  backend "s3" {}
}

provider "aws" {
  region  = var.aws_region
  version = "~> 2.39.0"
}

provider "template" {
  version = "~> 2.1"
}

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

locals {
  name_prefix = "${var.env}-${var.base_name}"
}

module "auth0-duo-idp-hook-updates" {
  source           = "../../../../common/cloud/aws/terraform/modules/idp-hook-updates"
  aws_region       = var.aws_region
  name_prefix      = local.name_prefix
  env_name         = var.env
  is_okta          = false
  lambda_file_path = "${path.module}/../dist/idp-hook-updates.zip"
  lambda_handler   = "./auth0/duo/aws/src/Auth0DuoAws.handler"
  lambda_timeout   = 29

  lambda_environment = {
    DUO_ENDPOINT  = var.duo_endpoint,
    SM_SECRETS_ID = local.name_prefix
  }
}

# Data returned by this module.
output "api-gateway-endpoint" {
  value = module.auth0-duo-idp-hook-updates.api-gateway-endpoint
}


