module "lambda" {
  source                 = "git::ssh://git@github.com/spring-media/ep-genesis.git//tf-12/lambda"
  functionname_prefix    = var.lambda_functionname
  stage                  = var.stage
  use_cloudwatch_logging = true
  logging_level          = var.logging_level
  distribution_file      = "../../dist.zip"

  environment_variables = {
    SLACK_TOKEN      = "${var.slack_token}"
    SLACK_CHANNEL    = "${var.slack_channel}"
  }
}
