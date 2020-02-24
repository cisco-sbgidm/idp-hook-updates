import { OktaService } from '../src/OktaService';
import { AwsSecretsService } from '@aws/AwsSecretsService';

const args = require('yargs')
    .usage('Usage: $0 --eventHookName [string] --eventHookEndpoint [string] --smSecretsId [string] --oktaEndpoint [string] --awsRegion [string]')
    .demandOption(['eventHookName', 'eventHookEndpoint', 'smSecretsId', 'oktaEndpoint', 'awsRegion'])
    .argv;

process.env.SM_SECRETS_ID = args['smSecretsId'];
process.env.OKTA_ENDPOINT = args['oktaEndpoint'];
process.env.AWS_REGION = args['awsRegion'];
const secretService = new AwsSecretsService();
secretService.init().then(() => {
  const oktaService = new OktaService(secretService);
  oktaService.setupEventHook(args['eventHookName'], args['eventHookEndpoint']).then(() => {
    console.log('Okta setup is completed');
  });
})
.catch((error: any) => {
  console.log(error);
});
