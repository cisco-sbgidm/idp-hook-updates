"use strict";
const Auth0DuoGcp = require('./auth0/duo/gcp/src/Auth0DuoGcp');

exports.auth0DuoGcp = async (request, response) => Auth0DuoGcp.auth0DuoGcp(request, response);

