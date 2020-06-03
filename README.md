![Build](https://github.com/cisco-sbgidm/idp-hook-updates/workflows/Build/badge.svg)
![Audit](https://github.com/cisco-sbgidm/idp-hook-updates/workflows/Audit/badge.svg)
![CI](https://github.com/cisco-sbgidm/idp-hook-updates/workflows/CI/badge.svg)
[![published](https://static.production.devnetcloud.com/codeexchange/assets/images/devnet-published.svg)](https://developer.cisco.com/codeexchange/github/repo/cisco-sbgidm/idp-hook-updates)

# IdP Hook Updates

This project is designed to synchronize user identities between cloud based Identity Providers (IdPs) and cloud based Multi Factor Authentication (MFA) providers.  
While some of the user identities synchronization can be achieved using the SCIM specification ([RFC 7643](https://tools.ietf.org/html/rfc7643)), that specification does not not cover MFA use cases.

The project relies on IdPs to provide Webhooks for asynchronous notifications of user identity changes on one side, and relies on the MFA providers to provide administrative APIs to reflect these changes.  
The project uses Hexagonal architecture to allow connecting different IdPs and MFA providers.

**Supported Identity Providers**

* Okta
* Auth0

**Supported MFA Providers**

* Duo Security

**Supported Cloud Providers**

* AWS
* Azure
* GCP

The Webhooks endpoint can run anywhere as long as it can get the IdP requests and invoke the MFA providers APIs.

## Use Case Description

1. Create sophisticated MFA policies:  
   When a user enrolls an MFA device, the information the MFA provider collects is the user email and phone number.
   The user's profile information and group/role information are not transferred to the MFA provider.  
   By using this integration, the profile information and group/role information are constantly synchronized to the MFA provider and can be used for creating sophisticated MFA policies.

1. Simpler operations when a user cannot access an MFA device:  
   If a user cannot access an MFA device, an admin needs to reset the MFA link in the IdP portal to trigger enrollment of a new MFA device for the user.  
   When an admin resets the MFA for a user in the IdP portal, it deletes the link between the user and the MFA account; however, the user is still associated to the enrolled device in the MFA provider.  
   In this case, when the user next logs in to the IdP and is required to add MFA, the MFA provider recognizes the user already has an enrolled device and does not prompt the user to enroll new devices.  
   The workaround in this case is to delete the MFA device in the MFA portal as well.  
   By using this integration, when an admin resets the MFA for a user in the IdP portal it also deletes the association between the user and the enrolled device in the MFA provider automatically.

## Flow diagram

![](flow.png "Flow diagram")

A user can update his profile details in the IdP service.  
An admin can perform the following actions in the IdP service:
* create/delete a user
* create/rename/delete a group
* associate/disassociate a user to a group
* disable/reenable a user
* reset MFA for a user

## Installation

### Prerequisites

* `yarn` Package Manager
* `terraform` Infrastructure provisioning tool

#### macOS
1. Install [Brew](https://brew.sh/)
1. Install yarn - `brew install yarn`
1. Install terraform - `brew install terraform`

#### Windows
1. [Install yarn](https://classic.yarnpkg.com/en/docs/install/#windows-stable)
1. [Intsall terraform](https://learn.hashicorp.com/terraform/getting-started/install.html)

### Installing dependencies
Run `yarn install`

### Create artifacts
Run `yarn zip` to create zip files with the hook function code that can be deployed using the instructions below

## Instructions for deployment
The instructions below use terraform to automatically provision resources on your selected cloud provider, deploy the hook function code and register the hook in the Identity Provider service.

* [Synchronizing Okta and Duo Security using AWS](okta/duo/aws/README.md)
* [Synchronizing Okta and Duo Security using GCP](okta/duo/gcp/README.md)
* [Synchronizing Okta and Duo Security using Azure](okta/duo/azure/README.md)
* [Synchronizing Auth0 and Duo Security using AWS](auth0/duo/aws/README.md)
* [Synchronizing Auth0 and Duo Security using GCP](auth0/duo/gcp/README.md)
* [Synchronizing Auth0 and Duo Security using Azure](auth0/duo/azure/README.md)

## How to test the software
Run unit tests and code coverage `yarn test`

Unit tests are executed on every push to master and the status is shown in a badge on the top of this page.

## Getting help
If you have questions, concerns, bug reports, etc., please create an issue against this repository.
