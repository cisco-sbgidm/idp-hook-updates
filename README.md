![Build](https://github.com/cisco-sbgidm/idp-hook-updates/workflows/Build/badge.svg)
![Audit](https://github.com/cisco-sbgidm/idp-hook-updates/workflows/Audit/badge.svg)

# IdP Hook Updates

This project is designed to synchronize user identities between cloud based Identity Providers (IdPs) and cloud based Multi Factor Authentication (MFA) providers.
While some of the user identities synchronization can be achieved using the SCIM specification that specification does not not cover MFA use cases.

The project relies on IdPs to provide Webhooks for a-sync notifications on user identity changes on one side and relies on the MFA providers to provide administrative APIs to reflect these changes.
The project uses Hexagonal architecture to allow connecting different IdPs and MFA providers.

**Supported Identity Providers**
* Okta

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

### Synchronizing Okta and Duo Security using AWS

---
**The steps below will be replaced by a single script soon**
---

#### Create an Okta API Token
Follow the instructions in https://developer.okta.com/docs/guides/create-an-api-token/create-the-token/

### Set up a Duo Admin application
Duo Admin API with "Grant read resource" and "Grant write resource" permissions is required to create idp update hook.
Follow one of the below options to define it.
1. Create Admin API using the instructions in https://duo.com/docs/adminapi#first-steps
2. Use an existing Admin API with "Grant applications" permission, and execute
`yarn duo:setup --ikey <admin_api_integration_key> --skey <admin_api_secret_key> --apiHost <admin_api__host> --adminApiName <admin_api_name_to_create>`
Use script's `integrationKey` and `secretKey` output to setup secret key below

### Generate a secret for authenticating Okta hook events
Generate a the secret value Okta should send in the authorization header of requests

### Set up AWS resources
* Update the variables in `terraform/dev/variables.tfvars`
* Create S3 bucket where terraform state will reside
* Run terraform commands. Replace S3 bucket parameters with the right values. `cd terraform; terraform init -backend-config="bucket=sbg-sso-terraform-state" -backend-config="key=idp-hook-updates/dev/terraform.tfstate" -backend-config="region=us-east-1"; terraform apply -var-file=dev/variables.tfvar`

### Register the Okta Event Hook
1. Follow the instructions in https://developer.okta.com/docs/guides/set-up-event-hook/register-your-endpoint/
Use the following event types:
   1. user.lifecycle.create
   1. user.lifecycle.delete.initiated
   1. user.lifecycle.suspend
   1. user.lifecycle.unsuspend
   1. user.account.update_profile
   1. group.user_membership.add
   1. group.user_membership.remove
   1. user.mfa.factor.deactivate

For example:
```
curl -X POST \
  https://<okta url>/api/v1/eventHooks \
  -H 'Authorization: SSWS <your Okta API token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Integration event hook",
    "events": {
        "type": "EVENT_TYPE",
        "items": [
            "user.lifecycle.create",
            "user.lifecycle.delete.initiated",
            "user.lifecycle.suspend",
            "user.lifecycle.unsuspend",
            "user.account.update_profile",
            "group.user_membership.add",
            "group.user_membership.remove",
            "user.mfa.factor.deactivate"
        ]
    },
    "channel": {
        "type": "HTTP",
        "version": "1.0.0",
        "config": {
            "uri": "<Your AWS API Gateway URL>",
            "authScheme": {
                "type": "HEADER",
                "key": "Authorization",
                "value": "<Secret string>"
            }
        }
    }
}'
```

### Verify your hook endpoint
1. Verify your endpoint using the instructions in https://developer.okta.com/docs/guides/set-up-event-hook/verify-your-endpoint/

## How to test the software
Run unit tests and code coverage `yarn test`

Unit tests are executed on every push to master and the status is shown in a badge on the top of this page.

## Getting help
If you have questions, concerns, bug reports, etc., please create an issue against this repository.

