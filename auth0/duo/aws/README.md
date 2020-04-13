# Synchronizing Auth0 and Duo Security using AWS

## Initial setup of required resources
1. [Set up a Duo Admin application](https://duo.com/docs/adminapi#first-steps) with `Grant applications` and `Grant read resource` permissions.  
   This application creates a new application for the integration with `Grant read resource` and `Grant write resource` permissions which is used by the integration.
2. Create s3 bucket to store terraform state
3. Import AWS credentials as environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
4. Run the following command
    ```
    yarn setup:auth0:duo:aws --applicationPrefix <applicationPrefix> --awsRegion <awsRegion> --s3BucketName <s3BucketName> --duoEndpoint <duoEndpoint> --ikey <admin_api_integration_key> --skey <admin_api_secret_key>
    ```
    * applicationPrefix - string that will be used in names of AWS resources
    * s3BucketName - s3 bucket from step 3
    * awsRegion - aws region where s3 bucket was created and where all AWS resources will be created
    * duoEndpoint - Duo API host (e.g. https\://something.duosecurity.com)
    * ikey - Duo integration key from step 1
    * skey - Duo secret key from step 1
5. [Register the hook in Auth0](https://auth0.com/docs/extensions/management-api-webhooks)
    * Set `AUTH0_API_ENDPOINTS` to `roles,users`
    * Set `AUTHORIZATION` to the secret that can be found in the output of the previous command
    * Set `WEBHOOK_URL` to the hook endpoint that can be found in the output of the previous command

## Update of the Lambda function code
1. Import AWS credentials as environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
2. Run the following command
    ```
    yarn setup:auth0:duo:aws --applicationPrefix <applicationPrefix> --awsRegion <awsRegion> --s3BucketName <s3BucketName> --duoEndpoint <duoEndpoint> --ikey <admin_api_integration_key> --skey <admin_api_secret_key>
    ```
    * applicationPrefix - application prefix used in the initial setup
    * s3BucketName - s3 bucket used in the initial setup
    * awsRegion - aws region used in the initial setup
    * duoEndpoint - Duo API host (e.g. https\://something.duosecurity.com)
    * ikey - Duo integration key used in the initial setup
    * skey - Duo secret key used in the initial setup
