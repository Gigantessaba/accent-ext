const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const transcribe = new AWS.TranscribeService();
const polly = new AWS.Polly();

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  // Handle OPTIONS request
  if (event.requestContext.http.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Expose-Headers': '*',
        'Access-Control-Max-Age': '300'
      },
      body: ''
    };
  }

  try {
    if (!event.body) {
      throw new Error('No request body provided');
    }

    let body = event.body;
    if (event.isBase64Encoded) {
      body = Buffer.from(event.body, 'base64').toString();
    }

    console.log('Content-Type:', event.headers['content-type']);
    
    const boundary = event.headers['content-type']?.split('boundary=')[1];
    if (!boundary) {
      throw new Error('No boundary found in content-type header');
    }

    console.log('Boundary:', boundary);

    const parts = body.split(`--${boundary}`);
    console.log('Number of parts:', parts.length);
    
    let audioData = null;
    let accent = 'en-US';
    let voice = 'Matthew';
    
    for (const part of parts) {
      console.log('Processing part:', part.substring(0, 100) + '...');
      
      if (part.includes('name="audio"')) {
        const matches = part.match(/\r\n\r\n(.*?)\r\n/s);
        if (matches && matches[1]) {
          audioData = Buffer.from(matches[1], 'base64');
          console.log('Found audio data, size:', audioData.length);
        }
      } else if (part.includes('name="accent"')) {
        const matches = part.match(/\r\n\r\n(.*?)\r\n/);
        if (matches && matches[1]) {
          accent = matches[1].trim();
          console.log('Found accent:', accent);
        }
      } else if (part.includes('name="voice"')) {
        const matches = part.match(/\r\n\r\n(.*?)\r\n/);
        if (matches && matches[1]) {
          voice = matches[1].trim();
          console.log('Found voice:', voice);
        }
      }
    }

    if (!audioData) {
      throw new Error('No audio data found in request');
    }

    const timestamp = Date.now();
    const inputKey = `input/${timestamp}.webm`;
    
    console.log('Uploading to S3:', inputKey);
    
    await s3.putObject({
      Bucket: process.env.BUCKET_NAME,
      Key: inputKey,
      Body: audioData,
      ContentType: 'audio/webm'
    }).promise();

    console.log('Starting transcription job');
    
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

    console.log('Waiting for transcription');
    await waitForTranscription(`job-${timestamp}`);

    console.log('Getting transcription results');
    const transcriptData = await s3.getObject({
      Bucket: process.env.BUCKET_NAME,
      Key: `transcript/${timestamp}.json`
    }).promise();

    const transcript = JSON.parse(transcriptData.Body.toString());
    const text = transcript.results.transcripts[0].transcript;

    console.log('Converting text to speech');
    const speechParams = {
      Engine: 'neural',
      LanguageCode: accent,
      OutputFormat: 'mp3',
      Text: text,
      TextType: 'text',
      VoiceId: voice
    };

    const synthesizedSpeech = await polly.synthesizeSpeech(speechParams).promise();

    console.log('Cleaning up S3 files');
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
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Expose-Headers': '*'
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
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Expose-Headers': '*'
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
  const maxRetries = 30;

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