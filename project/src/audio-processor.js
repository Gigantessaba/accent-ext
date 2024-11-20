import { state } from './state.js';
import { showError } from './utils.js';

export async function startProcessing() {
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
      
      if (state.audioChunks.length >= 3) {
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
    const settings = await chrome.storage.local.get(['accent', 'voice', 'enabled']);
    if (!settings.enabled) {
      state.isProcessing = false;
      return;
    }

    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('accent', settings.accent || 'en-US');
    formData.append('voice', settings.voice || 'Matthew');

    console.log('Sending request to API Gateway...');
    const response = await fetch('https://7xw75x81q5.execute-api.us-east-1.amazonaws.com/prod/process-audio', {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'audio/mpeg',
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error:', errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const processedAudioBlob = await response.blob();
    playProcessedAudio(processedAudioBlob);
  } catch (error) {
    console.error('Error processing audio:', error);
    showError('Audio processing failed. Please try again.');
    state.isProcessing = false;
    return;
  }

  setTimeout(() => processNextInQueue(), 100);
}

function playProcessedAudio(audioBlob) {
  const audio = new Audio(URL.createObjectURL(audioBlob));
  const video = document.querySelector('video');
  
  if (video) {
    audio.currentTime = video.currentTime;
    audio.playbackRate = video.playbackRate;
    video.muted = true;
    
    audio.play().catch(error => {
      console.error('Error playing processed audio:', error);
      video.muted = false;
    });

    audio.onended = () => {
      URL.revokeObjectURL(audio.src);
    };
  }
}