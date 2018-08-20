module "config" {
  source = "ep-configuration.s3-eu-central-1.amazonaws.com/munch-bot"
}

module "lambda" {
  source = "../modules/lambda"
  stage = "${terraform.workspace}"
  splunk_api_token = "token"
  slack_token = "${module.config.slack_token}"
  slack_channel = "${terraform.workspace == "prod" ? "#general" : "@cgohlke"}"
}

module "trigger" {
  source = "../modules/trigger"
  lambda_functionname = "${module.lambda.function_name}"
  lambda_arn  = "${module.lambda.arn}"
  lambda_version  = "${module.lambda.version}"
  stage = "${terraform.workspace}"
  cron_expression = "${terraform.workspace == "prod" ? "cron(0 10 ? * MON-FRI *)" : "cron(0 10 ? * MON *)"}"
}