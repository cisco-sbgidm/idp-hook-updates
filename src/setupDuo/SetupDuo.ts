import { DuoCreateAdminApi } from './DuoCreateAdminApi';
import { DuoAdminAPI } from '../duo/DuoAdminAPI';
import { DuoCreateAdminApiResponse } from './DuoCreateAdminApiResponse';

const args = require('yargs')
    .usage('Usage: $0 --ikey [string] --skey [string] --apiHost [string] --adminApiName [string]')
    .demandOption(['ikey', 'skey', 'apiHost', 'adminApiName'])
    .argv;

const adminApi = new DuoCreateAdminApi(new DuoAdminAPI(args['ikey'], args['skey'], args['apiHost']));
adminApi.createIdpHookAdminAPI(args['adminApiName']).then((response: DuoCreateAdminApiResponse) => {
  console.log(JSON.stringify(response));
}).catch((error: any) => {
  console.log(JSON.stringify(error));
});
