module "lambda" {
  source = "git::ssh://git@github.com/spring-media/ep-genesis.git//lambda"
  functionname_prefix = "${var.lambda_functionname_prefix}"
  stage = "${var.stage}"
  logging_level = "${var.logging_level}"
  distribution_file = "../../dist.zip"

  environment_variables = {
    SLACK_TOKEN = "${var.slack_token}"
    SPLUNK_API_TOKEN = "${var.splunk_api_token}"
    SLACK_CHANNEL = "${var.slack_channel}"
  }
}
