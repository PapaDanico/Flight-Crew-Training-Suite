provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = "dnca-fcts"
      Operator  = var.operator_short_code
      ManagedBy = "terraform"
      Component = "platform"
    }
  }
}
