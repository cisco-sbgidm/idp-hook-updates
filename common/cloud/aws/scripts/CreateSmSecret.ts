import { AwsSecretsService } from '@src/AwsSecretsService';

const args = require('yargs')
    .usage('Usage: $0 --secretId [string] --secret [string] --awsRegion [string]')
    .demandOption(['secretId', 'secret', 'awsRegion'])
    .argv;

process.env.AWS_REGION = args['awsRegion'];
const secretService = new AwsSecretsService();
secretService.createSecret(args['secretId'], args['secret']).then(() => {
  console.log('SM secret successfully created');
})
.catch((error: any) => {
  console.log(error);
});
