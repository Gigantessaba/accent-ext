# Audio Accent Converter

This Chrome extension converts audio accents in real-time using AWS services.

## Setup Instructions

1. Configure AWS Credentials:
   ```bash
   export AWS_ACCESS_KEY_ID="your_access_key"
   export AWS_SECRET_ACCESS_KEY="your_secret_key"
   export AWS_REGION="us-east-1"
   ```

2. Deploy AWS Infrastructure:
   ```bash
   cd infrastructure
   npm install
   npm run deploy
   ```

3. Update Extension Configuration:
   - After deployment, copy the API Gateway URL from the Terraform output
   - Replace `YOUR_API_GATEWAY_URL` in `content.js` with the actual URL

4. Load the Chrome Extension:
   - Open Chrome and go to `chrome://extensions/`
   - Enable Developer Mode
   - Click "Load unpacked" and select the extension directory

## Features

- Real-time accent conversion
- Multiple accent options (American, British, Australian, Indian)
- Different voice choices
- Seamless audio processing
- Minimal impact on video playback

## Architecture

- Chrome Extension: Captures and processes audio in chunks
- AWS Lambda: Handles audio conversion using Amazon Transcribe and Polly
- Amazon S3: Temporary storage for audio processing
- Amazon API Gateway: Secure endpoint for the extension

## Note

This extension requires an AWS account with the following services:
- Amazon S3
- AWS Lambda
- Amazon API Gateway
- Amazon Transcribe
- Amazon Polly