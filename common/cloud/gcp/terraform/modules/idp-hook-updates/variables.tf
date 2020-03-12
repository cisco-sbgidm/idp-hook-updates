variable "gcp_region" {
  type = string
}

variable "gcp_project" {
  type = string
}

variable "name_prefix" {
  type = string
}

variable "function_file_path" {
  type = string
}

variable "function_environment" {
  type = map(string)
}

variable "function_entry_point" {
  type = string
}

variable "vpc_connector_id" {
  type = string
}
