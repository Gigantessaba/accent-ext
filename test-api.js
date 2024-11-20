import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

async function testApiGateway() {
  try {
    // Create a simple WebM file with silent audio
    const audioData = Buffer.from([
      0x1a, 0x45, 0xdf, 0xa3, // EBML Header
      0x42, 0x87, 0x81, 0x02, // DocTypeVersion
      0x42, 0x85, 0x81, 0x02, // DocTypeReadVersion
      0xA3, 0x42, 0x86, 0x81, 0x01 // Basic audio frame
    ]);

    // Save test file
    fs.writeFileSync('test.webm', audioData);
    console.log('Created test.webm file');

    // Create form data
    const form = new FormData();
    form.append('audio', fs.createReadStream('test.webm'), {
      filename: 'test.webm',
      contentType: 'audio/webm'
    });
    form.append('accent', 'en-US');
    form.append('voice', 'Matthew');

    console.log('Sending request to API Gateway...');
    
    const response = await fetch(
      'https://gdtshkeye0.execute-api.us-east-1.amazonaws.com/prod/process-audio',
      {
        method: 'POST',
        body: form,
        headers: form.getHeaders() // Let FormData handle the Content-Type and boundary
      }
    );

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    // Save response to file
    const buffer = await response.buffer();
    fs.writeFileSync('response.mp3', buffer);
    console.log('Saved response to response.mp3');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Cleanup
    try {
      fs.unlinkSync('test.webm');
      console.log('Cleaned up test file');
    } catch (e) {
      console.error('Error cleaning up test file:', e);
    }
  }
}

testApiGateway();