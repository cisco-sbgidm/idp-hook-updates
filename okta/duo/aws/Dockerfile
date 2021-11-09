FROM node:12-alpine

ENV TERRAFORM_VERSION=0.12.24

# Install bash
RUN apk add --no-cache bash

# Install aws-cli
RUN apk -Uuv add groff less python3 py-pip
RUN pip install awscli
RUN apk --purge -v del py-pip
RUN rm -rf /var/cache/apk/*

# update CAs
RUN apk update && apk add ca-certificates
RUN rm -rf /var/cache/apk/*

# Install terraform
RUN wget https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip
RUN unzip terraform_${TERRAFORM_VERSION}_linux_amd64.zip -d /usr/bin

# Create app directory
WORKDIR /usr/idp-hook-updates

# Copy application
COPY publish.* ./
COPY terraform okta/duo/aws/terraform
COPY dist/common/cloud/aws/terraform  common/cloud/aws/terraform
COPY dist/idp-hook-updates.zip  okta/duo/aws/dist/idp-hook-updates.zip
COPY dist/scripts/configure/index.js okta/duo/aws/scripts/configure.js
COPY dist/scripts/update/index.js okta/duo/aws/scripts/update.js

# Mark publishing script as entry point
ENTRYPOINT [ "/bin/bash", "/usr/idp-hook-updates/publish.sh" ]
