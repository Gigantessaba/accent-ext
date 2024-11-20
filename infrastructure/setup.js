const fs = require('fs');
const path = require('path');

async function setup() {
  try {
    // Load environment variables from .env.local
    const envPath = path.join(__dirname, '..', '.env.local');
    console.log('Loading environment from:', envPath);
    
    if (!fs.existsSync(envPath)) {
      throw new Error('.env.local file not found. Please copy .env.local.example to .env.local and fill in your AWS credentials.');
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    // Parse .env file content
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) return;
      
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=');
        envVars[key.trim()] = value.replace(/^["']|["']$/g, '').trim();
      }
    });

    // Verify required variables
    const requiredVars = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
    const missingVars = requiredVars.filter(key => !envVars[key]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required variables in .env.local: ${missingVars.join(', ')}`);
    }

    console.log('AWS Region:', envVars.AWS_REGION);
    console.log('Access Key ID:', envVars.AWS_ACCESS_KEY_ID?.substring(0, 5) + '...');

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