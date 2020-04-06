# Synchronizing Auth0 and Duo Security using Azure

## Initial setup of required resources
1. [Set up a Duo Admin application](https://duo.com/docs/adminapi#first-steps) with `Grant applications` permission
2. Create Azure Blob storage container to store terraform state
3. Download Azure CLI
4. [Sign in with Azure CLI](https://docs.microsoft.com/en-us/cli/azure/authenticate-azure-cli?view=azure-cli-latest)
5. Run the following command
    ```
    yarn setup:auth0:duo:azure --applicationPrefix <applicationPrefix> --azureLocation "<azureLocation>" --stateBackendResourceGroupName <stateBackendResourceGroupName> --stateBackendStorageAccountName <stateBackendStorageAccountName> --azureBlobContainer <azureBlobContainer> --duoEndpoint <duoEndpoint> --ikey  <admin_api_integration_key> --skey <admin_api_secret_key>
    ```
    * applicationPrefix - string that will be used in names of AWS resources
    * azureLocation - Azure location where all Azure resources will be created
    * stateBackendResourceGroupName - Blob Container resource group name from step 2
    * stateBackendStorageAccountName - Blob Container storage account name from step 2
    * azureBlobContainer - Blob Container container name from step 2
    * duoEndpoint - Duo api host (https://something.duosecurity.com)
    * ikey - Duo integration key from step 1
    * skey - Duo secret key from step 1
6. [Register the hook in Auth0](https://auth0.com/docs/extensions/management-api-webhooks)
    * Set `AUTH0_API_ENDPOINTS` to `roles,users`
    * Set `AUTHORIZATION` to the secret that can be found in the output of the previous command
    * Set `WEBHOOK_URL` to the hook endpoint that can be found in the output of the previous command

## Update of the Lambda function code
1. [Sign in with Azure CLI](https://docs.microsoft.com/en-us/cli/azure/authenticate-azure-cli?view=azure-cli-latest)
2. Delete the storage account holding the function code (this is a manual step until https://github.com/terraform-providers/terraform-provider-azurerm/issues/1990 is fixed)
3. Run the following command
    ```
    yarn setup:auth0:duo:azure --applicationPrefix <applicationPrefix> --azureLocation "<azureLocation>" --stateBackendResourceGroupName <stateBackendResourceGroupName> --stateBackendStorageAccountName <stateBackendStorageAccountName> --azureBlobContainer <azureBlobContainer> --duoEndpoint <duoEndpoint> --ikey  <admin_api_integration_key> --skey <admin_api_secret_key>
    ```
    * applicationPrefix - string used in the initial setup
    * azureLocation - Azure location where all Azure resources will be created
    * stateBackendResourceGroupName - Blob Container resource group name used in the initial setup
    * stateBackendStorageAccountName - Blob Container storage account name used in the initial setup
    * azureBlobContainer - Blob Container container name used in the initial setup
    * duoEndpoint - Duo api host (https://something.duosecurity.com)
    * ikey - Duo integration key used in the initial setup
    * skey - Duo secret key from used in the initial setup
