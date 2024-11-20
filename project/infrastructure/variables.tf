variable "aws_region" {
  description = "AWS region"
  type        = string
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