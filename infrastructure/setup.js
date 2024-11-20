const fs = require('fs');
const path = require('path');

// Create AWS credentials directory
const awsDir = path.join(process.env.HOME, '.aws');
if (!fs.existsSync(awsDir)) {
  fs.mkdirSync(awsDir, { recursive: true });
}

// Create AWS credentials file
const credentials = `[default]
aws_access_key_id = ${process.env.AWS_ACCESS_KEY_ID || 'YOUR_ACCESS_KEY'}
aws_secret_access_key = ${process.env.AWS_SECRET_ACCESS_KEY || 'YOUR_SECRET_KEY'}
region = ${process.env.AWS_REGION || 'us-east-1'}
`;

fs.writeFileSync(path.join(awsDir, 'credentials'), credentials);

console.log('AWS credentials configured successfully!');