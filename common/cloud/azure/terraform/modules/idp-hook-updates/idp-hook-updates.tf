provider "external" {
  version = "~> 1.2"
}

data "azurerm_client_config" "current" {
}

locals {
  nodejs_runtime = "~10"
  // Key Vault and Storage Account "name" may only contain alphanumeric characters and dashes and must be between 3-24 chars
  kv_name = replace(replace("${var.name_prefix}-kv", "-", ""), "idphookupdates", "")
  sa_name = replace(replace("${var.name_prefix}-sa", "-", ""), "idphookupdates", "")
}

resource "azurerm_storage_account" "functions_sa" {
  name                     = local.sa_name
  resource_group_name      = var.resource_group_name
  location                 = var.azure_location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_app_service_plan" "functions_sp" {
  name                = "azure-functions-test-service-plan"
  resource_group_name = var.resource_group_name
  location            = var.azure_location
  kind                = "FunctionApp"
  sku {
    tier = "Standard"
    size = "S1"
  }
}

resource "azurerm_storage_container" "functions_sc" {
  name                  = "function-releases"
  storage_account_name  = azurerm_storage_account.functions_sa.name
  container_access_type = "private"
}

resource "azurerm_storage_blob" "function_blob" {
  name                   = "idp-hook-updates-functionapp.zip"
  storage_account_name   = azurerm_storage_account.functions_sa.name
  storage_container_name = azurerm_storage_container.functions_sc.name
  type                   = "Block"
  source                 = var.functionapp_file_path
}

data "azurerm_storage_account_sas" "functions_sas" {
  start             = formatdate("YYYY-MM-DD", timeadd(timestamp(), "-24h"))
  expiry            = formatdate("YYYY-MM-DD", timeadd(timestamp(), "24h"))
  connection_string = azurerm_storage_account.functions_sa.primary_connection_string
  https_only        = true
  resource_types {
    service   = false
    container = false
    object    = true
  }
  services {
    blob  = true
    queue = false
    table = false
    file  = false
  }
  permissions {
    read    = true
    write   = false
    delete  = false
    list    = false
    add     = false
    create  = false
    update  = false
    process = false
  }
}

resource "azurerm_function_app" "idp_hook_updates" {
  name                      = var.name_prefix
  resource_group_name       = var.resource_group_name
  location                  = var.azure_location
  app_service_plan_id       = azurerm_app_service_plan.functions_sp.id
  storage_connection_string = azurerm_storage_account.functions_sa.primary_connection_string
  https_only                = true
  version                   = "~3"

  app_settings = merge(var.functionapp_environment, {
    KEY_VAULT_NAME               = local.kv_name
    HASH                         = filesha256(var.functionapp_file_path)
    FUNCTIONS_WORKER_RUNTIME     = "node"
    WEBSITE_NODE_DEFAULT_VERSION = local.nodejs_runtime
    WEBSITE_RUN_FROM_PACKAGE     = "https://${azurerm_storage_account.functions_sa.name}.blob.core.windows.net/${azurerm_storage_container.functions_sc.name}/${azurerm_storage_blob.function_blob.name}${data.azurerm_storage_account_sas.functions_sas.sas}"
  })

  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_key_vault" "secrets" {
  name                = local.kv_name
  location            = var.azure_location
  resource_group_name = var.resource_group_name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    secret_permissions = [
      "set"
    ]
  }

  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = azurerm_function_app.idp_hook_updates.identity.0.principal_id

    secret_permissions = [
      "get", "set"
    ]
  }
}

output "key-vault-name" {
  value = azurerm_key_vault.secrets.name
}

output "functionapp-endpoint" {
  value = "https://${azurerm_function_app.idp_hook_updates.name}.azurewebsites.net/api/IdpHookFunction"
}
