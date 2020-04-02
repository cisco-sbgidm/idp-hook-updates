data "aws_region" "current" {}
data "aws_caller_identity" "current" {}
data "aws_secretsmanager_secret" "idp_hook_updates" {
  name = var.name_prefix
}

locals {
  nodejs_runtime = "nodejs12.x"
}

resource "aws_iam_role" "idp_hook_updates" {
  name = var.name_prefix

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
  name   = var.name_prefix
  role   = aws_iam_role.idp_hook_updates.id
  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
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
        "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.name_prefix}:*"
      ]
    }
  ]
}
EOF
}

resource "aws_lambda_function" "idp_hook_updates" {
  function_name    = var.name_prefix
  handler          = var.lambda_handler
  role             = aws_iam_role.idp_hook_updates.arn
  runtime          = local.nodejs_runtime
  filename         = var.lambda_file_path
  source_code_hash = filebase64sha256(var.lambda_file_path)
  timeout          = var.lambda_timeout

  environment {
    variables = var.lambda_environment
  }
}

resource "aws_cloudwatch_log_group" "log_group" {
  name              = "/aws/lambda/${aws_lambda_function.idp_hook_updates.function_name}"
  retention_in_days = 30
}

resource "aws_api_gateway_rest_api" "idp_hook_updates" {
  name = var.name_prefix
  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_method" "idp_hook_updates_get" {
  count         = var.is_okta ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.idp_hook_updates.id
  resource_id   = aws_api_gateway_rest_api.idp_hook_updates.root_resource_id
  http_method   = "GET"
  authorization = "NONE"
  request_parameters = {
    "method.request.header.X-Okta-Verification-Challenge" = true
  }
}

resource "aws_api_gateway_integration" "idp_hook_updates_get" {
  count                   = var.is_okta ? 1 : 0
  rest_api_id             = aws_api_gateway_rest_api.idp_hook_updates.id
  resource_id             = aws_api_gateway_rest_api.idp_hook_updates.root_resource_id
  http_method             = aws_api_gateway_method.idp_hook_updates_get[count.index].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.idp_hook_updates.invoke_arn
}

resource "aws_api_gateway_method_response" "idp_hook_updates_get" {
  count      = var.is_okta ? 1 : 0
  depends_on = [aws_api_gateway_integration.idp_hook_updates_get]

  rest_api_id = aws_api_gateway_rest_api.idp_hook_updates.id
  resource_id = aws_api_gateway_rest_api.idp_hook_updates.root_resource_id
  http_method = aws_api_gateway_method.idp_hook_updates_get[count.index].http_method
  status_code = "200"
  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_lambda_permission" "idp_hook_updates_get" {
  count         = var.is_okta ? 1 : 0
  statement_id  = "${var.name_prefix}-get-allow-execution-from-api-gateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.idp_hook_updates.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:${aws_api_gateway_rest_api.idp_hook_updates.id}/*/${aws_api_gateway_method.idp_hook_updates_get[count.index].http_method}/"
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
  statement_id  = "${var.name_prefix}-post-allow-execution-from-api-gateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.idp_hook_updates.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:${aws_api_gateway_rest_api.idp_hook_updates.id}/*/${aws_api_gateway_method.idp_hook_updates_post.http_method}/"
}

resource "aws_api_gateway_deployment" "idp_hook_updates" {
  depends_on = [aws_api_gateway_integration.idp_hook_updates_get, aws_api_gateway_integration.idp_hook_updates_post]

  rest_api_id = aws_api_gateway_rest_api.idp_hook_updates.id
  stage_name  = "idp-hook-updates"
}

# Data returned by this module.
output "api-gateway-endpoint" {
  value = aws_api_gateway_deployment.idp_hook_updates.invoke_url
}

output "role-id" {
  value = aws_iam_role.idp_hook_updates.id
}
