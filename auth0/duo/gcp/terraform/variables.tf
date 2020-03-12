variable "gcp_region" {
  type = string
}

variable "gcp_project" {
  type = string
}

variable "base_name" {
  type    = string
  default = "auth0-duo-idp-hook-updates"
}

variable "env" {
  type = string
}

variable "duo_endpoint" {
  type = string
}
