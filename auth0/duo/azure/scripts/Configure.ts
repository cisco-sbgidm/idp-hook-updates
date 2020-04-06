import * as _ from 'lodash';
import { exec } from 'child_process';
import util from 'util';
import { DuoAdminAPI } from '@duo/DuoAdminAPI';

const args = require('yargs')
  .usage('Usage: $0 --applicationPrefix [string] --azureLocation [string] --stateBackendResourceGroupName [string] --stateBackendStorageAccountName [string] --azureBlobContainer [string] ' +
    '--duoEndpoint [string] --ikey [string] --skey [string]')
  .demandOption(['applicationPrefix', 'stateBackendResourceGroupName', 'stateBackendStorageAccountName', 'azureBlobContainer', 'ikey', 'skey'])
  .describe('applicationPrefix', 'string that will be used in names of Azure resources')
  .describe('azureLocation', 'The Azure location where the resources will be deployed')
  .describe('stateBackendResourceGroupName', 'resource group name for the Blob Storage Account holding terraform state')
  .describe('stateBackendStorageAccountName', 'Blob Storage Account name holding terraform state')
  .describe('azureBlobContainer', 'existing Blob Container name')
  .describe('duoEndpoint', 'Duo api host( https://something.duosecurity.com)')
  .describe('ikey', 'Duo Admin Api integration key')
  .describe('skey', 'Duo Admin Api secret key')
  .argv;

configure(
  args['applicationPrefix'], args['azureLocation'], args['stateBackendResourceGroupName'], args['stateBackendStorageAccountName'],
  args['azureBlobContainer'], args['duoEndpoint'], args['ikey'], args['skey'])
  .then(({ eventHookEndpoint, apiAuthorizationSecret }) => {
    console.log(`To complete the setup please register the hook in Auth0 using WEBHOOK_URL ${eventHookEndpoint} and AUTHORIZATION ${apiAuthorizationSecret} as described in the README`);
  })
  .catch((error: any) => {
    console.log(error);
  });

async function configure(applicationPrefix: string, azureLocation: string, stateBackendResourceGroupName: string, stateBackendStorageAccountName: string, azureBlobContainer: string,
                         duoEndpoint: string, ikey: string, skey: string): Promise<any> {
  const applicationName: string = `${applicationPrefix}-auth0-duo-idp-hook-updates`;
  const duoAdminApiName: string = `${applicationPrefix}-auth0-azure-idp-hook-updates`;

  console.log(`Setup DUO admin application: ${duoAdminApiName}`);
  const adminApi = new DuoAdminAPI(ikey, skey, duoEndpoint);
  const duoResponse = await adminApi.setupIdpHookAdminApi(duoAdminApiName);

  console.log('Setup Azure resources, can take several minutes');
  await shellCommand(`cd terraform; terraform init -reconfigure -backend-config="resource_group_name=${stateBackendResourceGroupName}" -backend-config="storage_account_name=${stateBackendStorageAccountName}" -backend-config="container_name=${azureBlobContainer}"`);
  await shellCommand(`cd terraform; terraform apply -auto-approve -var azure_location="${azureLocation}" -var duo_endpoint="${duoEndpoint}/admin/v1" -var env="${applicationPrefix}"`);

  const terraformOutput: string = await shellCommand('cd terraform; terraform output -json');

  console.log('Create secrets in Azure Key Vault');
  const keyVaultName = _.get(JSON.parse(terraformOutput), 'key-vault-name.value');
  const apiAuthorizationSecret: string = Math.random().toString(36).substring(2, 15);

  await shellCommand(`az keyvault secret set --vault-name ${keyVaultName} --name "apiKey" --value "na"`);
  await shellCommand(`az keyvault secret set --vault-name ${keyVaultName} --name "authorization" --value "${apiAuthorizationSecret}"`);
  await shellCommand(`az keyvault secret set --vault-name ${keyVaultName} --name "integrationKey" --value "${duoResponse.integrationKey}"`);
  await shellCommand(`az keyvault secret set --vault-name ${keyVaultName} --name "signatureSecret" --value "${duoResponse.secretKey}"`);

  const eventHookEndpoint = _.get(JSON.parse(terraformOutput), 'functionapp-endpoint.value');
  return { eventHookEndpoint, apiAuthorizationSecret };
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
