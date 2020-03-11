variable "azure_location" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "name_prefix" {
  type = string
}

variable "functionapp_file_path" {
  type = string
}

variable "functionapp_environment" {
  type = map(string)
}

