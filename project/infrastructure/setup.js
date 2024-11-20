const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

async function setup() {
  try {
    // Load environment variables
    const envPath = path.join(__dirname, '..', '.env.local');
    const envConfig = dotenv.config({ path: envPath });

    if (envConfig.error) {
      console.error('Could not load .env.local file. Using environment variables...');
    }

    // Use environment variables
    const awsRegion = process.env.AWS_REGION || 'us-east-1';
    const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!awsAccessKeyId || !awsSecretAccessKey) {
      throw new Error('AWS credentials not found. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
    }

    // Create terraform.tfvars file
    const tfvars = `aws_region = "${awsRegion}"
aws_access_key_id = "${awsAccessKeyId}"
aws_secret_access_key = "${awsSecretAccessKey}"
project_name = "audio-accent-converter"
environment = "dev"`;

    fs.writeFileSync(path.join(__dirname, 'terraform.tfvars'), tfvars);
    console.log('terraform.tfvars file created successfully!');

  } catch (error) {
    console.error('Error during setup:', error);
    process.exit(1);
  }
}