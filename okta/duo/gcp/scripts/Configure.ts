import * as _ from 'lodash';
import { exec } from 'child_process';
import util from 'util';
import { OktaService } from '@common/OktaService';
import { GcpSecretsService } from '@gcp/GcpSecretsService';
import { DuoAdminAPI } from '@duo/DuoAdminAPI';

const args = require('yargs')
  .usage('Usage: $0 --applicationPrefix [string] --gcpProject [string], --gcpRegion [string] --bucketName [string] ' +
    '--oktaEndpoint [string] , --oktaApiToken [string] --duoEndpoint [string] --ikey [string], --skey [string]')
  .demandOption(['applicationPrefix', 'gcpProject', 'gcpRegion', 'bucketName', 'oktaEndpoint', 'duoEndpoint', 'ikey', 'skey', 'oktaApiToken'])
  .describe('applicationPrefix', 'string that will be used in names of GCP resources')
  .describe('gcpProject', 'GCP project')
  .describe('gcpRegion', 'region where application will be deployed')
  .describe('bucketName', 'existing bucket name, where terraform state will be stored')
  .describe('oktaEndpoint', 'Okta Api endpoint(https://something/api/v1)')
  .describe('oktaApiToken', 'Okta Api Token')
  .describe('duoEndpoint', 'Duo api host( https://something.duosecurity.com)')
  .describe('ikey', 'Duo Admin Api integration key')
  .describe('skey', 'Duo Admin Api secret key')
  .argv;

configure(args['applicationPrefix'], args['gcpRegion'], args['gcpProject'], args['bucketName'], args['oktaEndpoint'],
          args['duoEndpoint'], args['ikey'], args['skey'], args['oktaApiToken'])
  .then(() => {
    console.log('setup is completed');
  })
  .catch((error: any) => {
    console.log(error);
  });

async function configure(applicationPrefix: string, gcpRegion :string, gcpProject :string, bucketName: string, oktaEndpoint: string,
                         duoEndpoint: string, ikey: string, skey: string, oktaApiToken: string): Promise <any> {
  const applicationName :string = `${applicationPrefix}-okta-duo-idp-hook-updates`;
  const duoAdminApiName : string = `${applicationPrefix}-okta-gcp-idp-hook-updates`;
  const oktaEventHookName :string = `${applicationPrefix}-duo-gcp-idp-integration-event-hook`;
  process.env.SM_SECRETS_ID = applicationName;
  process.env.OKTA_ENDPOINT = oktaEndpoint;
  process.env.GCP_REGION = gcpRegion;
  process.env.GCP_PROJECT = gcpProject;

  console.log(`Setup Duo admin application: ${duoAdminApiName}`);
  const adminApi = new DuoAdminAPI(ikey, skey, duoEndpoint);
  const duoResponse = await adminApi.setupIdpHookAdminApi(duoAdminApiName);

  console.log('Create secrets in GCP SM');
  const apiAuthorizationSecret :string = Math.random().toString(36).substring(2, 15);
  const secretService = new GcpSecretsService();
  const secret = {
    authorization: apiAuthorizationSecret,
    integrationKey: duoResponse.integrationKey,
    signatureSecret: duoResponse.secretKey,
    apiKey: oktaApiToken,
  };
  await secretService.createSecret(applicationName, JSON.stringify(secret));

  console.log('Setup GCP resources, can take several minutes');
  await shellCommand(`cd terraform; terraform init -force-copy -backend-config="bucket=${bucketName}" -backend-config="prefix=idp-hook-updates/${applicationName}"`);
  await shellCommand(`cd terraform; terraform apply -auto-approve -var gcp_region="${gcpRegion}" -var gcp_project="${gcpProject}" -var duo_endpoint="${duoEndpoint}/admin/v1" -var okta_endpoint="${oktaEndpoint}" -var env="${applicationPrefix}"`);
  const terraformOutput :string = await shellCommand('cd terraform; terraform output -json');

  console.log(`Setup Okta hook: ${oktaEventHookName}`);
  const eventHookEndpoint = _.get(JSON.parse(terraformOutput), 'hook-endpoint.value');
  await secretService.init();
  const oktaService = new OktaService(secretService);
  await oktaService.setupEventHook(oktaEventHookName, eventHookEndpoint);
}

async function shellCommand(command: string): Promise <any> {
  const promisifiedExec = util.promisify(exec);
  const { stdout, stderr } = await promisifiedExec(command);
  if (stderr) {
    throw new Error(stderr);
  }
  console.log(stdout);
  return stdout;
}
