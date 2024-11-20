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

  state.mediaRecorder.start(1000); // Collect 1-second chunks
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

    const response = await fetch('https://7xw75x81q5.execute-api.us-east-1.amazonaws.com/prod/process-audio', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const processedAudioBlob = await response.blob();
    playProcessedAudio(processedAudioBlob);
  } catch (error) {
    console.error('Error processing audio:', error);
    showError('Audio processing failed. Please try again.');
    // Reset processing state after error
    state.isProcessing = false;
    return;
  }

  // Continue processing queue
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

    // Clean up blob URL after audio ends
    audio.onended = () => {
      URL.revokeObjectURL(audio.src);
    };
  }
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ff4444;
    color: white;
    padding: 10px 20px;
    border-radius: 4px;
    z-index: 9999;
    font-family: Arial, sans-serif;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  `;
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  
  setTimeout(() => {
    errorDiv.style.transition = 'opacity 0.5s ease-out';
    errorDiv.style.opacity = '0';
    setTimeout(() => errorDiv.remove(), 500);
  }, 3000);
}

// Initialize processing when enabled
chrome.storage.local.get(['enabled'], function(result) {
  if (result.enabled) {
    startProcessing();
  }
});

// Listen for changes in extension state
chrome.storage.onChanged.addListener(function(changes) {
  if (changes.enabled) {
    if (changes.enabled.newValue) {
      startProcessing();
    } else {
      if (state.mediaRecorder) {
        state.mediaRecorder.stop();
      }
    }
  }
});