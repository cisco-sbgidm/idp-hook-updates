variable "aws_region" {
  type = string
}

variable "is_okta" {
  type = bool
}

variable "name_prefix" {
  type = string
}

variable "lambda_file_path" {
  type = string
}

variable "lambda_environment" {
  type = map(string)
}

variable "lambda_handler" {
  type = string
}

variable "lambda_timeout" {
  type    = number
  default = 10
}
