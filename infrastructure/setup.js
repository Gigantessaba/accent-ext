const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

async function setup() {
  try {
    // Load environment variables from .env.local
    const envPath = path.join(__dirname, '..', '.env.local');
    const envConfig = dotenv.config({ path: envPath });

    if (envConfig.error) {
      console.warn('Warning: .env.local file not found, checking environment variables...');
    }

    // Get AWS credentials from environment variables
    const awsRegion = process.env.AWS_REGION || 'us-east-1';
    const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!awsAccessKeyId || !awsSecretAccessKey) {
      throw new Error(
        'AWS credentials not found. Please ensure you have set:\n' +
        '- AWS_ACCESS_KEY_ID\n' +
        '- AWS_SECRET_ACCESS_KEY\n' +
        'Either in .env.local file or as environment variables.'
      );
    }

    // Create terraform.tfvars file
    const tfvars = `aws_region            = "${awsRegion}"
aws_access_key_id     = "${awsAccessKeyId}"
aws_secret_access_key = "${awsSecretAccessKey}"
project_name          = "audio-accent-converter"
environment           = "dev"`;

    const tfvarsPath = path.join(__dirname, 'terraform.tfvars');
    fs.writeFileSync(tfvarsPath, tfvars);
    console.log('terraform.tfvars file created successfully!');

    // Verify the file was written correctly
    const written = fs.readFileSync(tfvarsPath, 'utf8');
    if (!written.includes(awsAccessKeyId) || !written.includes(awsSecretAccessKey)) {
      throw new Error('Failed to write credentials to terraform.tfvars correctly');
    }

  } catch (error) {
    console.error('\nError during setup:', error.message);
    console.error('\nPlease ensure your AWS credentials are set correctly before running the deployment.');
    process.exit(1);
  }
}

setup();