output "arn" {
  value = "${module.lambda.arn}"
}

output "function_name" {
  value = "${module.lambda.function_name}"
}

output "version" {
  value = "${module.lambda.version}"
}
