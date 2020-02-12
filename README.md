# idp-hook-updates

![Build](https://github.com/cisco-sbgidm/idp-hook-updates/workflows/Build/badge.svg)
![Audit](https://github.com/cisco-sbgidm/idp-hook-updates/workflows/Audit/badge.svg)

## Set up the project
Run `yarn install`

## Running in an AWS Lambda function (manually)

### Create an Okta API Token
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

### Set up keys and secrets
1. Store a new secret named `idp-hook-updates` in the AWS Secrets Manager service.  
   Specify the following key/value pairs:
   1. authorization - the secret string you provided to Okta when you registered your Event Hook
   1. integrationKey - Duo integration key
   1. signatureSecret - Duo application's secret key
   1. apiKey - Okta API Key

### Create a DynamoDB table
Create a DynamoDB table with the following properties:

1. Table Name: idp-hook-updates-events
1. Primary partition key: eventId (String)
1. Read/write capacity mode: On-demand

After the table is created add `Time to live attribute: expiration`

### Create an IAM Service Role
Create a role in the IAM service in AWS console:
Create role -> Lambda -> Create policy -> JSON
```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": ["dynamodb:GetItem", "dynamodb:PutItem"],
            "Resource": "<dynamoDB table ARN>"
        },
        {
            "Effect": "Allow",
            "Action": "secretsmanager:GetSecretValue",
            "Resource": "<secrets ARN>"
        },
        {
            "Effect": "Allow",
            "Action": "logs:CreateLogGroup",
            "Resource": "arn:aws:logs:us-east-1:<account-id>:*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": [
                "arn:aws:logs:us-east-1:<account-id>:log-group:/aws/lambda/idp-hook-updates:*"
            ]
        }
    ]
}
```

### Create and the Lambda function
1. Run `yarn zip` to create the function zip file in `dist/idp-hook-updates.zip`
1. Upload the function to AWS
   ```
   aws lambda create-function \
    --function-name idp-hook-updates \
    --runtime nodejs12.x \
    --zip-file fileb://dist/idp-hook-updates.zip \
    --handler index.handler \
    --role <service role ARN>
   ```

### Set up AWS API Gateway to invoke your Lambda function
1. Create an API in the AWS API Gateway service in AWS console:
   Create API -> REST API -> Import -> Import from Swagger or Open API 3
   ```
   {
      "swagger": "2.0",
      "info": {
        "version": "2020-01-14T10:05:37Z",
        "title": "idp-hook-updates"
      },
      "basePath": "/idp-hook-updates",
      "schemes": [
        "https"
      ],
      "paths": {
        "/": {
          "get": {
            "produces": [
              "application/json"
            ],
            "parameters": [
              {
                "name": "X-Okta-Verification-Challenge",
                "in": "header",
                "required": true,
                "type": "string"
              }
            ],
            "responses": {
              "200": {
                "description": "200 response",
                "schema": {
                  "$ref": "#/definitions/Empty"
                }
              }
            },
            "x-amazon-apigateway-integration": {
              "uri": "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/<your function ARN>/invocations",
              "responses": {
                "default": {
                  "statusCode": "200"
                }
              },
              "passthroughBehavior": "when_no_match",
              "httpMethod": "POST",
              "contentHandling": "CONVERT_TO_TEXT",
              "type": "aws_proxy"
            }
          },
          "post": {
            "produces": [
              "application/json"
            ],
            "parameters": [
              {
                "name": "Authorization",
                "in": "header",
                "required": true,
                "type": "string"
              }
            ],
            "responses": {
              "200": {
                "description": "200 response",
                "schema": {
                  "$ref": "#/definitions/Empty"
                }
              }
            },
            "x-amazon-apigateway-integration": {
              "uri": "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/<your function ARN>/invocations",
              "responses": {
                "default": {
                  "statusCode": "200"
                }
              },
              "passthroughBehavior": "when_no_match",
              "httpMethod": "POST",
              "contentHandling": "CONVERT_TO_TEXT",
              "type": "aws_proxy"
            }
          }
        }
      },
      "definitions": {
        "Empty": {
          "type": "object",
          "title": "Empty Schema"
        }
      }
    }
    ```
1. Actions -> Deploy API -> [New Stage] -> Stage name: staging -> Deploy (displays the Invoke URL)
1. Add a trigger to the Lambda function
   1. Open the Lambda function in the AWS Console
   1. Add trigger -> API Gateway -> API: Your API, Deployment stage: Your deployment stage, Security: AWS IAM -> Add

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
