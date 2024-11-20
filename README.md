# YouTube Accent Converter Chrome Extension

This Chrome extension converts English accents to American accents in YouTube videos using AWS services.

## Setup Instructions

1. Deploy AWS Infrastructure:
```bash
cd infrastructure
terraform init
terraform apply
```

2. Update the API Gateway URL:
- After deploying, get the API Gateway URL from AWS Console
- Replace `YOUR_API_GATEWAY_URL` in `content.js` with the actual URL

3. Load the Chrome Extension:
- Open Chrome and go to `chrome://extensions/`
- Enable Developer Mode
- Click "Load unpacked" and select the extension directory

## Architecture

- Chrome Extension: Captures audio from YouTube videos
- AWS Lambda: Processes audio using Amazon Transcribe and Polly
- S3: Stores audio files
- API Gateway: Provides HTTP endpoint for the extension

## Features

- Real-time accent conversion
- Toggle conversion on/off
- Minimal impact on video playback
- Secure audio processing using AWS services

## Note

The accent conversion requires an AWS account with appropriate services enabled:
- Amazon S3
- AWS Lambda
- Amazon API Gateway
- Amazon Transcribe
- Amazon Polly