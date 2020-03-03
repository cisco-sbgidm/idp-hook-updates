import { AzureKeyVaultService } from '../src/AzureKeyVaultService';

const args = require('yargs')
  .usage('Usage: $0 --secretName [string] --secretValue [string]')
  .demandOption(['secretName', 'secretValue'])
  .argv;

const secretService = new AzureKeyVaultService();
secretService.init()
  .then(() => {
    return secretService.createSecret(args['secretName'], args['secretValue']);
  })
  .then(() => {
    console.log('SM secret successfully created');
  })
  .catch((error: any) => {
    console.log(error);
  });
