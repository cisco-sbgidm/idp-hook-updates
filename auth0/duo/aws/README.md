# Synchronizing Auth0 and Duo Security using AWS

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
