# Synchronizing Auth0 and Duo Security using GCP

1. [Set up a Duo Admin application](https://duo.com/docs/adminapi#first-steps) with `Grant applications` permission
2. Create GCP storage bucket to store terraform state
3. Point environment variable GOOGLE_APPLICATION_CREDENTIALS to your GCP credentials files
4. Run the following command
```
yarn setup:auth0:duo:gcp --applicationPrefix <applicationPrefix> --gcpProject <gcpProject> --gcpRegion <--gcpRegion> --bucketName <bucketName> --duoEndpoint <duoEndpoint> --ikey <admin_api_integration_key> --skey <admin_api_secret_key>
```
* applicationPrefix - string that will be used in names of GCP resources
* bucketName - GCP storage bucket from step 2
* gcpProject - GCP project where storage bucket was created and where all GCP resources will be created
* gcpRegion - GCP region where storage bucket was created and where all GCP resources will be created
* duoEndpoint - Duo api host( https://something.duosecurity.com)
* ikey - Duo integration key from step 1
* skey - Duo secret key from step 1
5. [Register the hook in Auth0](https://auth0.com/docs/extensions/management-api-webhooks)
* Set `AUTH0_API_ENDPOINTS` to `roles,users`
* Set `AUTHORIZATION` to the secret that can be found in the output of the previous command
* Set `WEBHOOK_URL` to the hook endpoint that can be found in the output of the previous command
