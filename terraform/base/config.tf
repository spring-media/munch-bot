terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source = "hashicorp/aws"
      version = ">= 3.59.0"
    }
  }

  backend "s3" {
    bucket = "ep-terraform-state"
    key    = "munch-bot/base.tfstate"
    region = "eu-central-1"
  }
}

provider "aws" {
  region = "eu-central-1"
  default_tags {
    tags = local.cost_allocation_tags
  }
}