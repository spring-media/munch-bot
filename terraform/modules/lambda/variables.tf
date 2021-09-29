variable "region" {
  default = "eu-central-1"
}

variable "stage" {}

variable "slack_token" {}
variable "slack_channel" {}

variable "logging_level" {
  default = "INFO"
}

variable "lambda_functionname" {
  default = "munch-bot"
}



