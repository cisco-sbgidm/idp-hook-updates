import * as _ from 'lodash';
import { exec } from 'child_process';
import util from 'util';
import { AwsSecretsService } from '@aws/AwsSecretsService';
import { DuoAdminAPI, DuoCreateIntegrationResponse } from '@duo/DuoAdminAPI';

const args = require('yargs')
  .usage('Usage: $0 --applicationPrefix [string] --awsRegion [string] --s3BucketName [string] ' +
    '--duoEndpoint [string] --ikey [string], --skey [string]')
  .demandOption(['applicationPrefix', 'awsRegion', 's3BucketName', 'ikey'])
  .describe('applicationPrefix', 'string that will be used in names of AWS resources')
  .describe('awsRegion', 'region where application will be deployed')
  .describe('s3BucketName', 'existing bucket name, where terraform state will be stored')
  .describe('duoEndpoint', 'Duo api host( https://something.duosecurity.com)')
  .describe('ikey', 'Duo Admin Api integration key')
  .describe('skey', 'Duo Admin Api secret key')
  .argv;

configure(args['applicationPrefix'], args['awsRegion'], args['s3BucketName'],
          args['duoEndpoint'], args['ikey'], args['skey'])
  .then(() => {
    console.log('setup is completed');
  })
  .catch((error: any) => {
    console.log(error);
  });

async function configure(applicationPrefix: string, awsRegion :string, s3BucketName: string,
                         duoEndpoint: string, ikey: string, skey: string): Promise <any> {
  const applicationName :string = `${applicationPrefix}-auth0-duo-idp-hook-updates`;
  const duoAdminApiName : string = `${applicationPrefix}-auth0-aws-idp-hook-updates`;
  process.env.SM_SECRETS_ID = applicationName;
  process.env.AWS_REGION = awsRegion;

  console.log(`Setup DUO admin application: ${duoAdminApiName}`);
  const adminApi = new DuoAdminAPI(ikey, skey, duoEndpoint);
  const duoResponse = await adminApi.setupIdpHookAdminApi(duoAdminApiName);

  console.log('Create secrets in AWS SM');
  const apiAuthorizationSecret :string = Math.random().toString(36).substring(2, 15);
  const secretService = new AwsSecretsService();
  const secret = {
    authorization: apiAuthorizationSecret,
    integrationKey: duoResponse.integrationKey,
    signatureSecret: duoResponse.secretKey,
  };
  await secretService.createSecret(applicationName, JSON.stringify(secret));

  console.log('Setup AWS resources, can take several minutes');
  await shellCommand(`cd terraform; terraform init -reconfigure -backend-config="bucket=${s3BucketName}" -backend-config="key=idp-hook-updates/${applicationName}/terraform.tfstate" -backend-config="region=${awsRegion}"`);
  await shellCommand(`cd terraform; terraform apply -auto-approve -var aws_region="${awsRegion}" -var duo_endpoint="${duoEndpoint}/admin/v1" -var env="${applicationPrefix}"`);
  const terraformOutput :string = await shellCommand('cd terraform; terraform output -json');

  const eventHookEndpoint = _.get(JSON.parse(terraformOutput), 'api-gateway-endpoint.value');
  console.log(`AUTHORIZATION: "${apiAuthorizationSecret}"`);
  console.log(`WEBHOOK_URL: "${eventHookEndpoint}"`);
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
