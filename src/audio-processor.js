import { state } from './state.js';
import { showError } from './utils.js';

export async function startProcessing() {
  try {
    const video = document.querySelector('video');
    if (!video) {
      throw new Error('No video element found');
    }

    const stream = video.captureStream();
    const audioTrack = stream.getAudioTracks()[0];
    
    if (!audioTrack) {
      throw new Error('No audio track found');
    }

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

    state.mediaRecorder.onerror = (error) => {
      console.error('MediaRecorder error:', error);
      showError('Failed to record audio');
    };

    state.mediaRecorder.start(1000);
  } catch (error) {
    console.error('Error starting processing:', error);
    showError(error.message);
  }
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

    console.log('Sending request to API Gateway...');
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('accent', settings.accent || 'en-US');
    formData.append('voice', settings.voice || 'Matthew');

    const response = await fetch('https://gdtshkeye0.execute-api.us-east-1.amazonaws.com/prod/process-audio', {
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
    await playProcessedAudio(processedAudioBlob);
  } catch (error) {
    console.error('Error processing audio:', error);
    showError('Audio processing failed. Please try again.');
  } finally {
    state.isProcessing = false;
  }

  // Continue processing queue after a short delay
  setTimeout(() => processNextInQueue(), 100);
}

async function playProcessedAudio(audioBlob) {
  const audio = new Audio(URL.createObjectURL(audioBlob));
  const video = document.querySelector('video');
  
  if (!video) {
    throw new Error('Video element not found');
  }

  try {
    audio.currentTime = video.currentTime;
    audio.playbackRate = video.playbackRate;
    video.muted = true;
    
    await audio.play();
    
    audio.onended = () => {
      URL.revokeObjectURL(audio.src);
      video.muted = false;
    };

    audio.onerror = () => {
      console.error('Error playing processed audio');
      video.muted = false;
      URL.revokeObjectURL(audio.src);
    };
  } catch (error) {
    console.error('Error playing processed audio:', error);
    video.muted = false;
    URL.revokeObjectURL(audio.src);
    throw error;
  }
}