import * as _ from 'lodash';
import { exec } from 'child_process';
import util from 'util';
import { randomBytes } from 'crypto';
import { OktaService } from '@common/OktaService';
import { DuoAdminAPI } from '@duo/DuoAdminAPI';
import { SecretsService } from '@core/SecretsService';

const args = require('yargs')
  .usage('Usage: $0 --applicationPrefix [string] --azureLocation [string] --stateBackendResourceGroupName [string] --stateBackendStorageAccountName [string] --azureBlobContainer [string] ' +
    '--oktaEndpoint [string] , --oktaApiToken [string] --duoEndpoint [string] --ikey [string], --skey [string]')
  .demandOption(['applicationPrefix', 'stateBackendResourceGroupName', 'stateBackendStorageAccountName', 'azureBlobContainer', 'oktaEndpoint', 'ikey', 'oktaApiToken'])
  .describe('applicationPrefix', 'string that will be used in names of Azure resources')
  .describe('azureLocation', 'The Azure location where the resources will be deployed')
  .describe('stateBackendResourceGroupName', 'resource group name for the Blob Storage Account holding terraform state')
  .describe('stateBackendStorageAccountName', 'Blob Storage Account name holding terraform state')
  .describe('azureBlobContainer', 'existing Blob Container name')
  .describe('oktaEndpoint', 'Okta Api endpoint(https://something/api/v1)')
  .describe('oktaApiToken', 'Okta Api Token')
  .describe('duoEndpoint', 'Duo api host( https://something.duosecurity.com)')
  .describe('ikey', 'Duo Admin Api integration key')
  .describe('skey', 'Duo Admin Api secret key')
  .argv;

configure(
  args['applicationPrefix'], args['azureLocation'], args['stateBackendResourceGroupName'], args['stateBackendStorageAccountName'],
  args['azureBlobContainer'], args['oktaEndpoint'], args['duoEndpoint'], args['ikey'], args['skey'], args['oktaApiToken'])
  .then(() => {
    console.log('setup is completed');
  })
  .catch((error: any) => {
    console.log(error);
  });

async function configure(applicationPrefix: string, azureLocation: string, stateBackendResourceGroupName: string, stateBackendStorageAccountName: string, azureBlobContainer: string,
                         oktaEndpoint: string, duoEndpoint: string, ikey: string, skey: string, oktaApiToken: string): Promise<any> {
  const applicationName: string = `${applicationPrefix}-okta-duo-idp-hook-updates`;
  const duoAdminApiName: string = `${applicationPrefix}-okta-azure-idp-hook-updates`;
  const oktaEventHookName: string = `${applicationPrefix}-duo-azure-idp-integration-event-hook`;

  console.log(`Setup DUO admin application: ${duoAdminApiName}`);
  const adminApi = new DuoAdminAPI(ikey, skey, duoEndpoint);
  const duoResponse = await adminApi.setupIdpHookAdminApi(duoAdminApiName);

  console.log('Setup Azure resources, can take several minutes');
  await shellCommand(`cd terraform; terraform init -reconfigure -backend-config="resource_group_name=${stateBackendResourceGroupName}" -backend-config="storage_account_name=${stateBackendStorageAccountName}" -backend-config="container_name=${azureBlobContainer}"`);
  await shellCommand(`cd terraform; terraform apply -auto-approve -var azure_location="${azureLocation}" -var duo_endpoint="${duoEndpoint}/admin/v1" -var okta_endpoint="${oktaEndpoint}" -var env="${applicationPrefix}"`);

  const terraformOutput: string = await shellCommand('cd terraform; terraform output -json');

  console.log('Create secrets in Azure Key Vault');
  const keyVaultName = _.get(JSON.parse(terraformOutput), 'key-vault-name.value');
  const apiAuthorizationSecret: string = randomBytes(8).toString('hex');

  await shellCommand(`az keyvault secret set --vault-name ${keyVaultName} --name "authorization" --value "${apiAuthorizationSecret}"`);
  await shellCommand(`az keyvault secret set --vault-name ${keyVaultName} --name "integrationKey" --value "${duoResponse.integrationKey}"`);
  await shellCommand(`az keyvault secret set --vault-name ${keyVaultName} --name "signatureSecret" --value "${duoResponse.secretKey}"`);
  await shellCommand(`az keyvault secret set --vault-name ${keyVaultName} --name "apiKey" --value "${oktaApiToken}"`);

  console.log(`Setup Okta hook: ${oktaEventHookName}`);
  process.env.KEY_VAULT_NAME = keyVaultName;
  process.env.OKTA_ENDPOINT = oktaEndpoint;
  const eventHookEndpoint = _.get(JSON.parse(terraformOutput), 'functionapp-endpoint.value');
  // avoid using the Azure Key Vault from command line, which requires configuring an Azure AD Application Registration
  const secretService: SecretsService = {
    initiatorApiKey: oktaApiToken,
    recipientAuthorizationSecret: apiAuthorizationSecret,
    recipientIntegrationKey: duoResponse.integrationKey,
    recipientSignatureSecret: duoResponse.secretKey,
    init(): any {
    },
  };
  const oktaService = new OktaService(secretService);
  await oktaService.setupEventHook(oktaEventHookName, eventHookEndpoint);
}

async function shellCommand(command: string): Promise<any> {
  const promisifiedExec = util.promisify(exec);
  const { stdout, stderr } = await promisifiedExec(command);
  if (stderr) {
    throw new Error(stderr);
  }
  console.log(stdout);
  return stdout;
}
