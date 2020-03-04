# Synchronizing Okta and Duo Security using AWS

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
