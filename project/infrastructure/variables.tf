variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "aws_access_key_id" {
  description = "AWS access key ID"
  type        = string
  sensitive   = true
}

variable "aws_secret_access_key" {
  description = "AWS secret access key"
  type        = string
  sensitive   = true
}

variable "project_name" {
  description = "Project name to be used for resource naming"
  type        = string
  default     = "audio-accent-converter"
}

variable "environment" {
  description = "Environment (dev/prod)"
  type        = string
  default     = "dev"
}