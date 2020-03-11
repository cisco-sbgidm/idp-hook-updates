terraform {
  backend "azurerm" {
    key = "prod.terraform.tfstate"
  }
}

provider "azurerm" {
  version = "=2.0.0"
  features {}
}

locals {
  name_prefix = "${var.env}-${var.base_name}"
}

resource "azurerm_resource_group" "idp_resource_group" {
  name     = "${local.name_prefix}-resources"
  location = var.azure_location
}

resource "azurerm_redis_cache" "events_cache" {
  name                = "${local.name_prefix}-events-resources"
  location            = azurerm_resource_group.idp_resource_group.location
  resource_group_name = azurerm_resource_group.idp_resource_group.name
  capacity            = 0
  family              = "C"
  sku_name            = "Standard"
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"

  redis_configuration {
  }
}

module "okta-duo-idp-hook-updates" {
  source                = "../../../../common/cloud/azure/terraform/modules/idp-hook-updates"
  resource_group_name   = azurerm_resource_group.idp_resource_group.name
  azure_location        = azurerm_resource_group.idp_resource_group.location
  name_prefix           = local.name_prefix
  functionapp_file_path = "${path.module}/../dist/idp-hook-updates.zip"

  functionapp_environment = {
    OKTA_ENDPOINT        = var.okta_endpoint,
    DUO_ENDPOINT         = var.duo_endpoint,
    REDIS_CACHE_KEY      = azurerm_redis_cache.events_cache.primary_access_key
    REDIS_CACHE_HOSTNAME = azurerm_redis_cache.events_cache.hostname
    REDIS_CACHE_PORT     = azurerm_redis_cache.events_cache.ssl_port
  }
}

output "functionapp-endpoint" {
  value = module.okta-duo-idp-hook-updates.functionapp-endpoint
}

output "key-vault-name" {
  value = module.okta-duo-idp-hook-updates.key-vault-name
}
