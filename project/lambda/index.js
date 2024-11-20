const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const transcribe = new AWS.TranscribeService();
const polly = new AWS.Polly();

exports.handler = async (event) => {
  try {
    // Check if the event body exists and parse it if it's a string
    if (!event.body) {
      throw new Error('No request body provided');
    }

    let body = event.body;
    if (event.isBase64Encoded) {
      body = Buffer.from(event.body, 'base64').toString();
    }

    // Parse multipart form data
    const boundary = event.headers['content-type']?.split('boundary=')[1];
    if (!boundary) {
      throw new Error('No boundary found in content-type header');
    }

    // Split the body into parts using the boundary
    const parts = body.split(`--${boundary}`);
    
    // Initialize variables for form data
    let audioData = null;
    let accent = 'en-US';
    let voice = 'Matthew';
    
    // Process each part
    for (const part of parts) {
      if (part.includes('name="audio"')) {
        // Extract base64 audio data
        const matches = part.match(/\r\n\r\n(.*?)\r\n/s);
        if (matches && matches[1]) {
          audioData = Buffer.from(matches[1], 'base64');
        }
      } else if (part.includes('name="accent"')) {
        const matches = part.match(/\r\n\r\n(.*?)\r\n/);
        if (matches && matches[1]) {
          accent = matches[1].trim();
        }
      } else if (part.includes('name="voice"')) {
        const matches = part.match(/\r\n\r\n(.*?)\r\n/);
        if (matches && matches[1]) {
          voice = matches[1].trim();
        }
      }
    }

    if (!audioData) {
      throw new Error('No audio data found in request');
    }

    const timestamp = Date.now();
    const inputKey = `input/${timestamp}.webm`;
    
    // Upload audio to S3
    await s3.putObject({
      Bucket: process.env.BUCKET_NAME,
      Key: inputKey,
      Body: audioData,
      ContentType: 'audio/webm'
    }).promise();

    // Start transcription job
    const transcriptionJob = await transcribe.startTranscriptionJob({
      TranscriptionJobName: `job-${timestamp}`,
      Media: {
        MediaFileUri: `s3://${process.env.BUCKET_NAME}/${inputKey}`
      },
      MediaFormat: 'webm',
      LanguageCode: 'en-US',
      OutputBucketName: process.env.BUCKET_NAME,
      OutputKey: `transcript/${timestamp}.json`
    }).promise();

    // Wait for transcription to complete
    await waitForTranscription(`job-${timestamp}`);

    // Get transcription results
    const transcriptData = await s3.getObject({
      Bucket: process.env.BUCKET_NAME,
      Key: `transcript/${timestamp}.json`
    }).promise();

    const transcript = JSON.parse(transcriptData.Body.toString());
    const text = transcript.results.transcripts[0].transcript;

    // Convert text to speech with selected accent and voice
    const speechParams = {
      Engine: 'neural',
      LanguageCode: accent,
      OutputFormat: 'mp3',
      Text: text,
      TextType: 'text',
      VoiceId: voice
    };

    const synthesizedSpeech = await polly.synthesizeSpeech(speechParams).promise();

    // Clean up S3 files
    await Promise.all([
      s3.deleteObject({ Bucket: process.env.BUCKET_NAME, Key: inputKey }).promise(),
      s3.deleteObject({ Bucket: process.env.BUCKET_NAME, Key: `transcript/${timestamp}.json` }).promise()
    ]);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: synthesizedSpeech.AudioStream.toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ 
        error: error.message,
        details: error.stack 
      })
    };
  }
};

async function waitForTranscription(jobName) {
  let retries = 0;
  const maxRetries = 30; // 30 seconds timeout

  while (retries < maxRetries) {
    const { TranscriptionJob } = await transcribe.getTranscriptionJob({
      TranscriptionJobName: jobName
    }).promise();

    if (TranscriptionJob.TranscriptionJobStatus === 'COMPLETED') {
      return;
    } else if (TranscriptionJob.TranscriptionJobStatus === 'FAILED') {
      throw new Error(`Transcription job failed: ${TranscriptionJob.FailureReason}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    retries++;
  }

  throw new Error('Transcription job timed out');
}