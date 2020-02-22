import * as _ from 'lodash';
import { exec } from 'child_process';
import util from 'util';
import { OktaService } from '../src/OktaService';
import { AwsSecretsService } from '../src/AwsSecretsService';
import { DuoAdminAPI, DuoCreateAdminApiResponse } from '../src/DuoAdminAPI';

const args = require('yargs')
  .usage('Usage: $0 --applicationPrefix [string] --awsRegion [string] --s3BucketName [string] ' +
    '--oktaEndpoint [string] , --oktaApiToken[string] --duoEndpoint [string] --ikey[string], --skey[string]')
  .demandOption(['applicationPrefix', 'awsRegion', 's3BucketName', 'oktaEndpoint', 'ikey', 'oktaApiToken'])
  .describe('applicationPrefix', 'string that will be used in names of AWS resources')
  .describe('awsRegion', 'region where application will be deployed')
  .describe('s3BucketName', 'existing bucket name, where terraform state will be stored')
  .describe('oktaEndpoint', 'Okta api endpoint(https://something/api/v1)')
  .describe('oktaApiToken', 'Okta Api Token')
  .describe('duoEndpoint', 'Duo api host( https://something.duosecurity.com)')
  .describe('ikey', 'Duo Admin API integration key')
  .describe('skey', 'Duo Admin API secret key')
  .argv;

configure(args['applicationPrefix'], args['awsRegion'], args['s3BucketName'], args['oktaEndpoint'],
          args['duoEndpoint'], args['ikey'], args['skey'], args['oktaApiToken']).then(() => {
            console.log('setup is completed');
          })
.catch((error: any) => {
  console.log(error);
});

async function configure(applicationPrefix: string, awsRegion :string, s3BucketName: string, oktaEndpoint: string,
                         duoEndpoint: string, ikey: string, skey: string, oktaApiToken: string): Promise <any> {
  const applicationName = `${applicationPrefix}-idp-hook-updates`;
  process.env.SM_SECRETS_ID = applicationName;
  process.env.OKTA_ENDPOINT = oktaEndpoint;
  process.env.AWS_REGION = awsRegion;

  console.log('Setup DUO admin application');
  const adminApi = new DuoAdminAPI(ikey, skey, duoEndpoint);
  const duoResponse = await adminApi.createIdpHookAdminAPI(applicationName);

  console.log('Create secrets in AWS SM');
  const apiAuthorizationSecret :string = Math.random().toString(36).substring(2, 15);
  const secretService = new AwsSecretsService();
  const secret = {
    authorization: apiAuthorizationSecret,
    integrationKey: duoResponse.integrationKey,
    signatureSecret: duoResponse.secretKey,
    apiKey: oktaApiToken,
  };
  await secretService.createSecret(applicationName, JSON.stringify(secret));
  console.log('Setup AWS resourses, can take several minutes');
  await shellCommand(`cd terraform; terraform init -force-copy -backend-config="bucket=${s3BucketName}" -backend-config="key=idp-hook-updates/${applicationPrefix}/terraform.tfstate" -backend-config="region=${awsRegion}"`);
  await shellCommand(`cd terraform; terraform apply -auto-approve -var aws_region="${awsRegion}" -var duo_endpoint="${duoEndpoint}/admin/v1" -var okta_endpoint="${oktaEndpoint}" -var env="${applicationPrefix}"`);
  const terraformOutput :string = await shellCommand('cd terraform; terraform output -json');

  console.log('Setup Okta hook');
  const eventHookEndpoint = _.get(JSON.parse(terraformOutput), 'api-gateway-endpoint.value');
  await secretService.init();
  const oktaService = new OktaService(secretService);
  const eventHookName = `${applicationPrefix} idp integration event hook`;
  await oktaService.setupEventHook(eventHookName, eventHookEndpoint);
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