"use strict";
const OktaDuoGcp = require('./okta/duo/gcp/src/OktaDuoGcp');

exports.oktaDuoGcp = async (request, response) => OktaDuoGcp.oktaDuoGcp(request, response);

