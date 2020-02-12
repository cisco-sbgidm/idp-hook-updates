import { DuoAdminAPI, DuoCreateAdminApiResponse } from '../src/DuoAdminAPI';

const args = require('yargs')
    .usage('Usage: $0 --ikey [string] --skey [string] --apiHost [string] --adminApiName [string]')
    .demandOption(['ikey', 'skey', 'apiHost', 'adminApiName'])
    .argv;

const adminApi = new DuoAdminAPI(args['ikey'], args['skey'], args['apiHost']);
adminApi.createIdpHookAdminAPI(args['adminApiName']).then((response: DuoCreateAdminApiResponse) => {
  console.log(JSON.stringify(response));
}).catch((error: any) => {
  console.log(JSON.stringify(error));
});
