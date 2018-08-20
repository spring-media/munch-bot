variable "region" {
  default = "eu-central-1"
}

variable "stage" {}

variable "splunk_api_token" {}
variable "slack_token" {}
variable "slack_channel" {}

variable "logging_level" {
  default = "INFO"
}

variable "lambda_functionname_prefix" {
  default = "munch-bot"
}



