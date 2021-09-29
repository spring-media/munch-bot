//cron expression: https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html
resource "aws_cloudwatch_event_rule" "trigger_event_rule_menu" {
  name                = "${var.lambda_functionname}_event_rule_munch_bot"
  description         = "Send a trigger event to ${var.lambda_functionname}"
  schedule_expression = var.cron_expression 
  is_enabled          = var.stage == "prod"
}

resource "aws_cloudwatch_event_target" "trigger_event_target" {
  rule      = aws_cloudwatch_event_rule.trigger_event_rule_menu.name
  target_id = "${var.lambda_functionname}-trigger"
  arn       = var.lambda_arn
}

resource "aws_lambda_permission" "allow_trigger_event" {
  statement_id  = "${var.lambda_functionname}-${var.lambda_version}-${md5(timestamp())}-permission-munch-bot"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_functionname
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.trigger_event_rule_menu.arn
  depends_on = [
    aws_cloudwatch_event_target.trigger_event_target
  ]
}
