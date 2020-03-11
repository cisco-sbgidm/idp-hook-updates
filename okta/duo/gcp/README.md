# Synchronizing Okta and Duo Security using GCP

1. [Create an Okta API Token](https://developer.okta.com/docs/guides/create-an-api-token/create-the-token/)
2. [Set up a Duo Admin application Follow the instructions in](https://duo.com/docs/adminapi#first-steps)
3. Create GCP storage bucket to store terraform state
4. Point environment variable GOOGLE_APPLICATION_CREDENTIALS to your GCP credentials files
5. Run the following command
```
yarn setup:okta:duo:gcp --applicationPrefix <applicationPrefix> --gcpProject <gcpProject> --gcpRegion <--gcpRegion> --bucketName <bucketName> --oktaEndpoint <oktaEndpoint> --duoEndpoint <duoEndpoint> --ikey  <admin_api_integration_key> --skey <admin_api_secret_key> --oktaApiToken <oktaApiToken>
```
* applicationPrefix - string that will be used in names of GCP resources
* bucketName - GCP storage bucket from step 3
* gcpProject - GCP project where storage bucket was created and where all GCP resources will be created
* gcpRegion - GCP region where storage bucket was created and where all GCP resources will be created
* oktaEndpoint - Okta Api endpoint (https://something/api/v1)
* duoEndpoint - Duo api host (https://something.duosecurity.com)
* ikey - Duo integration key from step 2
* skey - Duo secret key from step 2
* oktaApiToken - Okta api token from step 1
