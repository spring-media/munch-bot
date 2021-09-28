locals {
  cost_allocation_tags = {
    Application = "Munch Bot"
    Family      = "Development"
    Project     = "munch-bot"
    Team        = "E-Team"
    Environment = terraform.workspace
  }
}