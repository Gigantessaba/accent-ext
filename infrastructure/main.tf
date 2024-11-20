terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# S3 bucket for storing audio files
resource "aws_s3_bucket" "audio_storage" {
  bucket = "audio-accent-converter-storage"
}

resource "aws_s3_bucket_public_access_block" "audio_storage" {
  bucket = aws_s3_bucket.audio_storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lambda function
resource "aws_lambda_function" "audio_processor" {
  filename         = "lambda/audio_processor.zip"
  function_name    = "audio-accent-converter"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 60
  memory_size     = 2048

  environment {
    variables = {
      BUCKET_NAME = aws_s3_bucket.audio_storage.id
    }
  }
}

# API Gateway with CORS
resource "aws_apigatewayv2_api" "api" {
  name          = "audio-accent-converter-api"
  protocol_type = "HTTP"
  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["POST", "OPTIONS"]
    allow_headers = ["*"]
    max_age      = 300
  }
}

resource "aws_apigatewayv2_stage" "prod" {
  api_id = aws_apigatewayv2_api.api.id
  name   = "prod"
  auto_deploy = true
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id           = aws_apigatewayv2_api.api.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.audio_processor.invoke_arn
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "process_audio" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /process-audio"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# IAM Role for Lambda with extended permissions
resource "aws_iam_role" "lambda_role" {
  name = "audio_accent_converter_lambda_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# IAM Policy for Lambda with Transcribe and Polly permissions
resource "aws_iam_role_policy" "lambda_policy" {
  name = "audio_accent_converter_lambda_policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "${aws_s3_bucket.audio_storage.arn}",
          "${aws_s3_bucket.audio_storage.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "transcribe:StartTranscriptionJob",
          "transcribe:GetTranscriptionJob"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "polly:SynthesizeSpeech"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}