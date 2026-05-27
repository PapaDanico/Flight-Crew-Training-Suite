terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 5.60" }
    random = { source = "hashicorp/random", version = "~> 3.6" }
  }

  # State backend. Uncomment + bootstrap an S3 bucket + DynamoDB lock
  # table BEFORE the first apply (chicken-and-egg) using
  # infra/terraform/bootstrap-state.sh. Local state is acceptable for
  # single-operator MVP runs.
  #
  # backend "s3" {
  #   bucket         = "dnca-tfstate-af-south-1"
  #   key            = "fcts/terraform.tfstate"
  #   region         = "af-south-1"
  #   dynamodb_table = "dnca-tfstate-lock"
  #   encrypt        = true
  # }
}
