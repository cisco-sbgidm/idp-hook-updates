import { DuoCreateAdminApi } from './DuoCreateAdminApi';
import { DuoAdminAPI } from '../duo/DuoAdminAPI';
import { DuoCreateAdminApiResponse } from './DuoCreateAdminApiResponse';

const args = require('yargs')
    .usage('Usage: $0 --ikey [string] --skey [string] --apihost [string]')
    .demandOption(['ikey', 'skey', 'apihost'])
    .argv;

const adminApi = new DuoCreateAdminApi(new DuoAdminAPI(args['ikey'], args['skey'], args['apihost']));
adminApi.createIdpHookAdminAPI('testb').then((response: DuoCreateAdminApiResponse) => {
  console.log(JSON.stringify(response));
}).catch((error: any) => {
  console.log(JSON.stringify(error));
});
