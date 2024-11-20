
// Audio processing state
const state = {
  mediaRecorder: null,
  audioChunks: [],
  processingQueue: [],
  isProcessing: false
};

async function startProcessing() {
  const video = document.querySelector('video');
  if (!video) return;

  const stream = video.captureStream();
  const audioTrack = stream.getAudioTracks()[0];
  
  if (!audioTrack) return;

  const mediaStream = new MediaStream([audioTrack]);
  state.mediaRecorder = new MediaRecorder(mediaStream, {
    mimeType: 'audio/webm;codecs=opus',
    bitsPerSecond: 128000
  });

  state.mediaRecorder.ondataavailable = async (event) => {
    if (event.data.size > 0) {
      state.audioChunks.push(event.data);
      
      if (state.audioChunks.length >= 3) { // Process every 3 seconds
        const audioToProcess = new Blob(state.audioChunks, { type: 'audio/webm' });
        state.processingQueue.push(audioToProcess);
        state.audioChunks = [];
        
        if (!state.isProcessing) {
          processNextInQueue();
        }
      }
    }
  };

  state.mediaRecorder.start(1000);
}

async function processNextInQueue() {
  if (state.processingQueue.length === 0) {
    state.isProcessing = false;
    return;
  }

  state.isProcessing = true;
  const audioBlob = state.processingQueue.shift();

  try {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('accent', 'en-US'); // Default accent for now
    formData.append('voice', 'Matthew'); // Default voice

    const response = await fetch('https://<your-api-gateway-endpoint>', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to process audio');
    }

    const audioBase64 = await response.text();
    const audioElement = new Audio(`data:audio/mp3;base64,${audioBase64}`);
    audioElement.play();
  } catch (error) {
    console.error('Error processing audio:', error);
  } finally {
    processNextInQueue();
  }
}

startProcessing();
