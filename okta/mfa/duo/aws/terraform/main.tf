terraform {
  backend "s3" {}
}

provider "aws" {
  region  = var.aws_region
  version = "~> 2.39.0"
}

provider "template" {
  version = "~> 2.1"
}

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

locals {
  name_prefix    = "${var.env}-${var.base_name}"
  nodejs_runtime = "nodejs12.x"
}

data "aws_secretsmanager_secret" "idp_hook_updates" {
  name = local.name_prefix
}

resource "aws_dynamodb_table" "events" {
  name         = "${local.name_prefix}-events"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "eventId"
  server_side_encryption {
    enabled = true
  }
  ttl {
    enabled = true
    attribute_name = "expiration"
  }

  attribute {
    name = "eventId"
    type = "S"
  }

  tags = {
    Name = "${local.name_prefix}-events"
  }
}

resource "aws_iam_role" "idp_hook_updates" {
  name = local.name_prefix

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "idp_hook_updates" {
  name   = local.name_prefix
  role   = aws_iam_role.idp_hook_updates.id
  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem"
      ],
      "Resource": [
        "${aws_dynamodb_table.events.arn}"
      ]
    },
    {
        "Effect": "Allow",
        "Action": "secretsmanager:GetSecretValue",
        "Resource": "${data.aws_secretsmanager_secret.idp_hook_updates.arn}"
    },
    {
      "Effect": "Allow",
      "Action": [
          "logs:CreateLogGroup"
      ],
      "Resource": [
        "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
      ],
      "Resource": [
        "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${local.name_prefix}:*"
      ]
    }
  ]
}
EOF
}

resource "aws_lambda_function" "idp_hook_updates" {
  function_name    = local.name_prefix
  handler          = "./okta/mfa/duo/aws/src/OktaDuoAws.handler"
  role             = aws_iam_role.idp_hook_updates.arn
  runtime          = local.nodejs_runtime
  filename         = "${path.module}/../dist/idp-hook-updates.zip"
  source_code_hash = filebase64sha256("${path.module}/../dist/idp-hook-updates.zip")

  environment {
    variables = {
      OKTA_ENDPOINT     = var.okta_endpoint,
      DUO_ENDPOINT      = var.duo_endpoint,
      EVENTS_TABLE_NAME = aws_dynamodb_table.events.id,
      SM_SECRETS_ID     = local.name_prefix
    }
  }
}


resource "aws_api_gateway_rest_api" "idp_hook_updates" {
  name = local.name_prefix
  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_method" "idp_hook_updates_get" {
  rest_api_id   = aws_api_gateway_rest_api.idp_hook_updates.id
  resource_id   = aws_api_gateway_rest_api.idp_hook_updates.root_resource_id
  http_method   = "GET"
  authorization = "NONE"
  request_parameters = {
    "method.request.header.X-Okta-Verification-Challenge" = true
  }
}

resource "aws_api_gateway_integration" "idp_hook_updates_get" {
  rest_api_id             = aws_api_gateway_rest_api.idp_hook_updates.id
  resource_id             = aws_api_gateway_rest_api.idp_hook_updates.root_resource_id
  http_method             = aws_api_gateway_method.idp_hook_updates_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.idp_hook_updates.invoke_arn
}

resource "aws_api_gateway_method_response" "idp_hook_updates_get" {
  depends_on = [aws_api_gateway_integration.idp_hook_updates_get]

  rest_api_id = aws_api_gateway_rest_api.idp_hook_updates.id
  resource_id = aws_api_gateway_rest_api.idp_hook_updates.root_resource_id
  http_method = aws_api_gateway_method.idp_hook_updates_get.http_method
  status_code = "200"
  response_models = {
    "application/json" = "Empty"
  }
}


resource "aws_lambda_permission" "idp_hook_updates_get" {
  statement_id  = "${local.name_prefix}-get-allow-execution-from-api-gateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.idp_hook_updates.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:${aws_api_gateway_rest_api.idp_hook_updates.id}/*/${aws_api_gateway_method.idp_hook_updates_get.http_method}/"
}

resource "aws_api_gateway_method" "idp_hook_updates_post" {
  rest_api_id   = aws_api_gateway_rest_api.idp_hook_updates.id
  resource_id   = aws_api_gateway_rest_api.idp_hook_updates.root_resource_id
  http_method   = "POST"
  authorization = "NONE"
  request_parameters = {
    "method.request.header.Authorization" = true
  }
}

resource "aws_api_gateway_integration" "idp_hook_updates_post" {
  rest_api_id             = aws_api_gateway_rest_api.idp_hook_updates.id
  resource_id             = aws_api_gateway_rest_api.idp_hook_updates.root_resource_id
  http_method             = aws_api_gateway_method.idp_hook_updates_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.idp_hook_updates.invoke_arn
}

resource "aws_api_gateway_method_response" "idp_hook_updates_post" {
  rest_api_id = aws_api_gateway_rest_api.idp_hook_updates.id
  resource_id = aws_api_gateway_rest_api.idp_hook_updates.root_resource_id
  http_method = aws_api_gateway_method.idp_hook_updates_post.http_method
  status_code = "200"
  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "idp_hook_updates_post" {
  depends_on = [aws_api_gateway_integration.idp_hook_updates_post]

  rest_api_id = aws_api_gateway_rest_api.idp_hook_updates.id
  resource_id = aws_api_gateway_rest_api.idp_hook_updates.root_resource_id
  http_method = aws_api_gateway_method.idp_hook_updates_post.http_method
  status_code = "200"

  response_templates = {
    "application/json" = ""
  }
}

resource "aws_lambda_permission" "idp_hook_updates_post" {
  statement_id  = "${local.name_prefix}-post-allow-execution-from-api-gateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.idp_hook_updates.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:${aws_api_gateway_rest_api.idp_hook_updates.id}/*/${aws_api_gateway_method.idp_hook_updates_post.http_method}/"
}

resource "aws_api_gateway_deployment" "idp_hook_updates" {
  depends_on = [aws_api_gateway_integration.idp_hook_updates_get, aws_api_gateway_integration.idp_hook_updates_post]

  rest_api_id = aws_api_gateway_rest_api.idp_hook_updates.id
  stage_name  = var.base_name
}

# Data returned by this module.
output "api-gateway-endpoint" {
  value = aws_api_gateway_deployment.idp_hook_updates.invoke_url
}
