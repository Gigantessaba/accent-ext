const fs = require('fs');
const path = require('path');

async function setup() {
  try {
    // Load environment variables from .env.local
    const envPath = path.join(__dirname, '..', '.env.local');
    console.log('Loading environment from:', envPath);
    
    if (!fs.existsSync(envPath)) {
      throw new Error('.env.local file not found');
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    // Parse .env file content
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    });

    // Verify required variables
    const requiredVars = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
    const missingVars = requiredVars.filter(key => !envVars[key]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required variables: ${missingVars.join(', ')}`);
    }

    // Create terraform.tfvars file
    const tfvars = `aws_region            = "${envVars.AWS_REGION}"
aws_access_key_id     = "${envVars.AWS_ACCESS_KEY_ID}"
aws_secret_access_key = "${envVars.AWS_SECRET_ACCESS_KEY}"
project_name          = "audio-accent-converter"
environment           = "dev"`;

    fs.writeFileSync(path.join(__dirname, 'terraform.tfvars'), tfvars);
    console.log('terraform.tfvars file created successfully!');

  } catch (error) {
    console.error('Error during setup:', error.message);
    process.exit(1);
  }
}

setup();