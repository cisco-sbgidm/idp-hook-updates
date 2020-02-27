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
  name_prefix = "${var.env}-${var.base_name}"
}

resource "aws_dynamodb_table" "events" {
  name         = "${local.name_prefix}-events"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "eventId"
  server_side_encryption {
    enabled = true
  }
  ttl {
    enabled        = true
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

module "okta-duo-idp-hook-updates" {
  source           = "../../../../common/cloud/aws/terraform/modules/idp-hook-updates"
  aws_region       = var.aws_region
  name_prefix      = local.name_prefix
  is_okta          = true
  lambda_file_path = "${path.module}/../dist/idp-hook-updates.zip"
  lambda_handler   = "./okta/duo/aws/src/OktaDuoAws.handler"

  lambda_environment = {
    OKTA_ENDPOINT     = var.okta_endpoint,
    DUO_ENDPOINT      = var.duo_endpoint,
    EVENTS_TABLE_NAME = aws_dynamodb_table.events.id,
    SM_SECRETS_ID     = local.name_prefix
  }
}

resource "aws_iam_role_policy" "idp_hook_updates_dynamodb" {
  name   = "${local.name_prefix}-dynamodb"
  role   = module.okta-duo-idp-hook-updates.role-id
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
    }
  ]
}
EOF
}


# Data returned by this module.
output "api-gateway-endpoint" {
  value = module.okta-duo-idp-hook-updates.api-gateway-endpoint
}
