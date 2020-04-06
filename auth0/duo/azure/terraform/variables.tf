variable "azure_location" {
  type = string
}

variable "base_name" {
  type    = string
  default = "okta-duo-idp-hook-updates"
}

variable "env" {
  type = string
}

variable "duo_endpoint" {
  type = string
}
