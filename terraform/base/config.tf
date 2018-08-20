terraform {
  required_version = "> 0.11.1"
  backend "s3" {
    bucket = "ep-terraform-state"
    key = "munch-bot/base.tfstate"
    region = "eu-central-1"
  }
}
