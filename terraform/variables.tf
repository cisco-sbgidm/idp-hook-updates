variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "base_name" {
  type    = string
  default = "idp-hook-updates"
}

variable "env" {
  type = string
}

variable "okta_endpoint" {
  type = string
}

variable "duo_endpoint" {
  type = string
}
