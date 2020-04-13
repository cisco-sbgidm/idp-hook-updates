# Synchronizing Okta and Duo Security using Azure

## Initial setup of required resources
1. [Create an Okta API Token](https://developer.okta.com/docs/guides/create-an-api-token/create-the-token/)
2. [Set up a Duo Admin application](https://duo.com/docs/adminapi#first-steps) with `Grant applications` and `Grant read resource` permissions.  
   This application creates a new application for the integration with `Grant read resource` and `Grant write resource` permissions which is used by the integration.
3. Create Azure Blob storage container to store terraform state
4. Download Azure CLI
5. [Sign in with Azure CLI](https://docs.microsoft.com/en-us/cli/azure/authenticate-azure-cli?view=azure-cli-latest)
6. Run the following command
    ```
    yarn setup:okta:duo:azure --applicationPrefix <applicationPrefix> --azureLocation "<azureLocation>" --stateBackendResourceGroupName <stateBackendResourceGroupName> --stateBackendStorageAccountName <stateBackendStorageAccountName> --azureBlobContainer <azureBlobContainer> --oktaEndpoint <oktaEndpoint> --duoEndpoint <duoEndpoint> --ikey  <admin_api_integration_key> --skey <admin_api_secret_key> --oktaApiToken <oktaApiToken>
    ```
    * applicationPrefix - string that will be used in names of AWS resources
    * azureLocation - Azure location where all Azure resources will be created
    * stateBackendResourceGroupName - Blob Container resource group name from step 3
    * stateBackendStorageAccountName - Blob Container storage account name from step 3
    * azureBlobContainer - Blob Container container name from step 3
    * oktaEndpoint - Okta Api endpoint (https\://something/api/v1)
    * duoEndpoint - Duo api host (https\://something.duosecurity.com)
    * ikey - Duo integration key from step 2
    * skey - Duo secret key from step 2
    * oktaApiToken - Okta api token from step 1

## Update of the Lambda function code
1. [Sign in with Azure CLI](https://docs.microsoft.com/en-us/cli/azure/authenticate-azure-cli?view=azure-cli-latest)
2. Delete the storage account holding the function code (this is a manual step until https://github.com/terraform-providers/terraform-provider-azurerm/issues/1990 is fixed)
3. Run the following command
    ```
    yarn setup:okta:duo:azure --applicationPrefix <applicationPrefix> --azureLocation "<azureLocation>" --stateBackendResourceGroupName <stateBackendResourceGroupName> --stateBackendStorageAccountName <stateBackendStorageAccountName> --azureBlobContainer <azureBlobContainer> --oktaEndpoint <oktaEndpoint> --duoEndpoint <duoEndpoint> --ikey  <admin_api_integration_key> --skey <admin_api_secret_key> --oktaApiToken <oktaApiToken>
    ```
    * applicationPrefix - string used in the initial setup
    * azureLocation - Azure location where all Azure resources will be created
    * stateBackendResourceGroupName - Blob Container resource group name used in the initial setup
    * stateBackendStorageAccountName - Blob Container storage account name used in the initial setup
    * azureBlobContainer - Blob Container container name used in the initial setup
    * oktaEndpoint - Okta Api endpoint (https\://something/api/v1)
    * duoEndpoint - Duo api host (https\://something.duosecurity.com)
    * ikey - Duo integration key from used in the initial setup
    * skey - Duo secret key used in the initial setup
    * oktaApiToken - Okta api token used in the initial setup
