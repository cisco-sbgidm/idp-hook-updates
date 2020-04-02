import { exec } from 'child_process';
import util from 'util';

const args = require('yargs')
  .usage('Usage: $0 --applicationPrefix [string] --awsRegion [string] --s3BucketName [string] ' +
    '--oktaEndpoint [string] --duoEndpoint [string]')
  .demandOption(['applicationPrefix', 'awsRegion', 's3BucketName', 'oktaEndpoint', 'duoEndpoint'])
  .describe('applicationPrefix', 'string that will be used in names of AWS resources')
  .describe('awsRegion', 'region where application will be deployed')
  .describe('s3BucketName', 'existing bucket name, where terraform state will be stored')
  .describe('oktaEndpoint', 'Okta Api endpoint(https://something/api/v1)')
  .describe('duoEndpoint', 'Duo api host( https://something.duosecurity.com)')
  .argv;

configure(args['applicationPrefix'], args['awsRegion'], args['s3BucketName'], args['oktaEndpoint'], args['duoEndpoint'])
  .then(() => {
    console.log('setup is completed');
  })
  .catch((error: any) => {
    console.log(error);
  });

async function configure(applicationPrefix: string, awsRegion: string, s3BucketName: string, oktaEndpoint: string,
                         duoEndpoint: string): Promise<any> {
  const applicationName: string = `${applicationPrefix}-okta-duo-idp-hook-updates`;

  console.log('Setup AWS resources, can take several minutes');
  await shellCommand(`cd terraform; terraform init -force-copy -backend-config="bucket=${s3BucketName}" -backend-config="key=idp-hook-updates/${applicationName}/terraform.tfstate" -backend-config="region=${awsRegion}"`);
  await shellCommand(`cd terraform; terraform apply -auto-approve -var aws_region="${awsRegion}" -var duo_endpoint="${duoEndpoint}/admin/v1" -var okta_endpoint="${oktaEndpoint}" -var env="${applicationPrefix}"`);
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
