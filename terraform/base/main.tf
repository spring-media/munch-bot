module "config" {
  source = "ep-configuration.s3-eu-central-1.amazonaws.com/munch-bot"
}

module "lambda" {
  source           = "../modules/lambda"
  stage            = terraform.workspace
  slack_token      = module.config.slack_token
  slack_channel    = terraform.workspace == "prod" ? "#essen_berlin" : "@cgohlke"
}

module "trigger" {
  source              = "../modules/trigger"
  lambda_functionname = module.lambda.function_name
  lambda_arn          = module.lambda.arn
  lambda_version      = module.lambda.version
  stage               = terraform.workspace
  cron_expression     = "cron(0 9 ? * MON-FRI *)"
}