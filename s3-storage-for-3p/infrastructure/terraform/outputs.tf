# Terraform outputs for easy reference after deployment

output "cognito_user_pool_id" {
  value       = aws_cognito_user_pool.main.id
  description = "Cognito User Pool ID"
}

output "cognito_user_pool_arn" {
  value       = aws_cognito_user_pool.main.arn
  description = "Cognito User Pool ARN"
}

output "cognito_user_pool_client_id" {
  value       = aws_cognito_user_pool_client.main.id
  description = "Cognito User Pool Client ID"
  sensitive   = true
}

output "cognito_user_pool_endpoint" {
  value       = aws_cognito_user_pool.main.endpoint
  description = "Cognito User Pool Endpoint"
}

output "s3_bucket_name" {
  value       = aws_s3_bucket.main.id
  description = "Main S3 Storage Bucket Name"
}

output "s3_bucket_arn" {
  value       = aws_s3_bucket.main.arn
  description = "Main S3 Storage Bucket ARN"
}

output "s3_bucket_domain_name" {
  value       = aws_s3_bucket.main.bucket_domain_name
  description = "S3 Bucket Domain Name"
}

output "s3_logs_bucket_name" {
  value       = aws_s3_bucket.logs.id
  description = "S3 Access Logs Bucket Name"
}

output "aws_region" {
  value       = var.aws_region
  description = "AWS Region for deployment"
}

output "environment" {
  value       = var.environment
  description = "Deployment environment"
}
