terraform {
  backend "azurerm" {
    key = "prod.terraform.tfstate"
  }
}

provider "azurerm" {
  version = "~> 2.1.0"
  features {}
}

locals {
  name_prefix = "${var.env}-${var.base_name}"
}

resource "azurerm_resource_group" "idp_resource_group" {
  name     = "${local.name_prefix}-resources"
  location = var.azure_location
}

module "okta-duo-idp-hook-updates" {
  source                = "../../../../common/cloud/azure/terraform/modules/idp-hook-updates"
  resource_group_name   = azurerm_resource_group.idp_resource_group.name
  azure_location        = azurerm_resource_group.idp_resource_group.location
  name_prefix           = local.name_prefix
  functionapp_file_path = "${path.module}/../dist/idp-hook-updates.zip"

  functionapp_environment = {
    DUO_ENDPOINT  = var.duo_endpoint
    SM_SECRETS_ID = local.name_prefix
  }
}

output "functionapp-endpoint" {
  value = module.okta-duo-idp-hook-updates.functionapp-endpoint
}

output "key-vault-name" {
  value = module.okta-duo-idp-hook-updates.key-vault-name
}
