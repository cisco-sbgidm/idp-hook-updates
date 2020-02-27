![Build](https://github.com/cisco-sbgidm/idp-hook-updates/workflows/Build/badge.svg)
![Audit](https://github.com/cisco-sbgidm/idp-hook-updates/workflows/Audit/badge.svg)

# IdP Hook Updates

This project is designed to synchronize user identities between cloud based Identity Providers (IdPs) and cloud based Multi Factor Authentication (MFA) providers.  
While some of the user identities synchronization can be achieved using the SCIM specification that specification does not not cover MFA use cases.

The project relies on IdPs to provide Webhooks for a-sync notifications on user identity changes on one side and relies on the MFA providers to provide administrative APIs to reflect these changes.  
The project uses Hexagonal architecture to allow connecting different IdPs and MFA providers.

**Supported Identity Providers**
* Okta
* Auth0

**Supported MFA Providers**
* Duo Security

The Webhooks endpoint can run anywhere as long as they can get the IdP requests and invoke the MFA providers APIs.

## Use Case Description

This project provides an example of running the Webhook endpoint synchronizing between Okta and Duo Security in AWS, using API Gateway, Lambda, Secrets Manager and DynamoDB.  
The AWS resources are deployed using terraform.

## Installation

### Prerequisites
1. Install yarn - on Mac `brew install yarn`
1. Install terraform - on Mac `brew install terraform`

### Installing dependencies
Run `yarn install`

### Create artifacts
Run `yarn zip`

## Synchronizing Okta and Duo Security using AWS

### Setup
1. Create an Okta API Token Follow the instructions in https://developer.okta.com/docs/guides/create-an-api-token/create-the-token/
2. Set up a Duo Admin application Follow the instructions in https://duo.com/docs/adminapi#first-steps
3. Create s3 bucket to store terraform state
4. Import AWS credentials as environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
5. Run the following command
```
yarn setup:okta:duo:aws --applicationPrefix <applicationPrefix> --awsRegion <awsRegion> --s3BucketName <s3BucketName> --oktaEndpoint <oktaEndpoint> --duoEndpoint <duoEndpoint> --ikey  <admin_api_integration_key> --skey <admin_api_secret_key> --oktaApiToken <oktaApiToken>
```
* applicationPrefix - string that will be used in names of AWS resources
* s3BucketName - s3 bucket from step 3
* awsRegion - aws region where s3 bucket was created and where all AWS resources will be created
* oktaEndpoint - Okta Api endpoint(https://something/api/v1)
* duoEndpoint - Duo api host( https://something.duosecurity.com)
* ikey - Duo integration key from step 2
* skey - Duo secret key from step 2
* oktaApiToken - Okta api token from step 1

## Synchronizing Auth0 and Duo Security using AWS

### Setup
1. Set up a Duo Admin application Follow the instructions in https://duo.com/docs/adminapi#first-steps
2. Create s3 bucket to store terraform state
3. Import AWS credentials as environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
4. Run the following command
```
yarn setup:auth0:duo:aws --applicationPrefix <applicationPrefix> --awsRegion <awsRegion> --s3BucketName <s3BucketName> --duoEndpoint <duoEndpoint> --ikey <admin_api_integration_key> --skey <admin_api_secret_key>
```
* applicationPrefix - string that will be used in names of AWS resources
* s3BucketName - s3 bucket from step 3
* awsRegion - aws region where s3 bucket was created and where all AWS resources will be created
* duoEndpoint - Duo api host( https://something.duosecurity.com)
* ikey - Duo integration key from step 1
* skey - Duo secret key from step 1
5. Register the hook in Auth0
Register the hook in Auth0 as described in https://auth0.com/docs/extensions/management-api-webhooks
* Set `AUTH0_API_ENDPOINTS` to `roles,users`
* Set `AUTHORIZATION` to the secret that can be found in the output of the previous command
* Set `WEBHOOK_URL` to the hook endpoint that can be found in the output of the previous command

## How to test the software
Run unit tests and code coverage `yarn test`

Unit tests are executed on every push to master and the status is shown in a badge on the top of this page.

## Getting help
If you have questions, concerns, bug reports, etc., please create an issue against this repository.
