output "api_endpoint" {
  description = "API Gateway endpoint URL for the audio processing endpoint"
  value       = "${aws_apigatewayv2_api.api.api_endpoint}/process-audio"
}

output "bucket_name" {
  description = "S3 bucket name for audio storage"
  value       = aws_s3_bucket.audio_storage.id
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.audio_processor.function_name
}