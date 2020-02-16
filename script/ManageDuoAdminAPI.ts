import { DuoAdminAPI, DuoCreateAdminApiResponse } from '../src/DuoAdminAPI';

const argv = require('yargs')
    .usage('usage: $0 <>')
    .command('createAdminAPI', 'Create Admin API', (yargs: any) => {
      return yargs.demandOption(['ikey', 'skey', 'apiHost', 'adminApiName'])
            .describe('ikey', 'Admin API integration key')
            .describe('skey', 'Admin API secret key')
            .describe('apiHost', 'Admin API url')
            .describe('adminApiName', 'new Admin API name')
            .help('help');
    })
    .command('deleteAdminAPI', 'Delete Admin API', (yargs: any) => {
        return yargs.demandOption(['ikey', 'skey', 'apiHost', 'deleteIkey'])
            .describe('ikey', 'Admin API integration key')
            .describe('skey', 'Admin API secret key')
            .describe('apiHost', 'Admin API url')
            .describe('deleteIkey', 'Integration key of Admin API to delete')
            .help('help');
    })
    .demandCommand(1, 'Provide command to execute: createAdminAPI | deleteAdminAPI')
    .argv;

const adminApi = new DuoAdminAPI(argv['ikey'], argv['skey'], argv['apiHost']);

switch (argv['_'][0]) {
  case 'createAdminAPI': {
    adminApi.createIdpHookAdminAPI(argv['adminApiName']).then((response: DuoCreateAdminApiResponse) => {
      console.log(JSON.stringify(response));
    }).catch((error: any) => {
      console.log(JSON.stringify(error));
    });
    break;
  }
  case 'deleteAdminAPI': {
    adminApi.deleteAdminApi(argv['deleteIkey']).then((response: any) => {
      console.log(JSON.stringify(response));
    }).catch((error: any) => {
      console.log(JSON.stringify(error));
    });
    break;
  }
  default: {
    console.error('Only createAdminAPI and deleteAdminAPI commands supported');
    break;
  }
}
