variable "gcp_region" {
  type = string
}

variable "gcp_project" {
  type = string
}

variable "base_name" {
  type    = string
  default = "okta-duo-idp-hook-updates"
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
