const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');

const lambdaDir = path.join(__dirname, '..', 'lambda');
const buildDir = path.join(__dirname, 'build');
const zipPath = path.join(__dirname, 'lambda');

async function buildLambda() {
  try {
    // Ensure directories exist
    await fs.ensureDir(zipPath);
    await fs.ensureDir(buildDir);

    // Clean build directory
    await fs.emptyDir(buildDir);

    // Copy lambda files with node_modules
    await fs.copy(lambdaDir, buildDir, {
      filter: (src) => {
        return !src.includes('.git') && !src.includes('dist');
      }
    });

    // Create zip file
    const output = fs.createWriteStream(path.join(zipPath, 'audio_processor.zip'));
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    output.on('close', () => {
      console.log('Lambda package created successfully!');
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);
    archive.directory(buildDir, false);
    await archive.finalize();

  } catch (error) {
    console.error('Error building Lambda package:', error);
    process.exit(1);
  }
}

buildLambda();