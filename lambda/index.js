const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const transcribe = new AWS.TranscribeService();
const polly = new AWS.Polly();

exports.handler = async (event) => {
  try {
    const { accent = 'en-US', voice = 'Matthew' } = JSON.parse(event.body);
    const audioData = Buffer.from(event.body, 'base64');
    const timestamp = Date.now();
    
    // Upload audio to S3
    const inputKey = `input/${timestamp}.webm`;
    await s3.putObject({
      Bucket: process.env.BUCKET_NAME,
      Key: inputKey,
      Body: audioData
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
        'Access-Control-Allow-Origin': '*'
      },
      body: synthesizedSpeech.AudioStream.toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};

async function waitForTranscription(jobName) {
  while (true) {
    const { TranscriptionJob } = await transcribe.getTranscriptionJob({
      TranscriptionJobName: jobName
    }).promise();

    if (TranscriptionJob.TranscriptionJobStatus === 'COMPLETED') {
      return;
    } else if (TranscriptionJob.TranscriptionJobStatus === 'FAILED') {
      throw new Error('Transcription job failed');
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}