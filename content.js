let mediaRecorder;
let audioChunks = [];
let processingQueue = [];
let isProcessing = false;

async function startProcessing() {
  const video = document.querySelector('video');
  if (!video) return;

  const stream = video.captureStream();
  const audioTrack = stream.getAudioTracks()[0];
  
  if (!audioTrack) return;

  const mediaStream = new MediaStream([audioTrack]);
  mediaRecorder = new MediaRecorder(mediaStream, {
    mimeType: 'audio/webm;codecs=opus'
  });

  mediaRecorder.ondataavailable = async (event) => {
    if (event.data.size > 0) {
      audioChunks.push(event.data);
      
      if (audioChunks.length >= 3) { // Process every 3 seconds
        const audioToProcess = new Blob(audioChunks, { type: 'audio/webm' });
        processingQueue.push(audioToProcess);
        audioChunks = [];
        
        if (!isProcessing) {
          processNextInQueue();
        }
      }
    }
  };

  mediaRecorder.start(1000); // Collect 1-second chunks
}

async function processNextInQueue() {
  if (processingQueue.length === 0) {
    isProcessing = false;
    return;
  }

  isProcessing = true;
  const audioBlob = processingQueue.shift();
  
  try {
    const settings = await chrome.storage.local.get(['accent', 'voice']);
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('accent', settings.accent || 'en-US');
    formData.append('voice', settings.voice || 'Matthew');

    const response = await fetch('https://7xw75x81q5.execute-api.us-east-1.amazonaws.com/prod/process-audio', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const processedAudioBlob = await response.blob();
    playProcessedAudio(processedAudioBlob);
  } catch (error) {
    console.error('Error processing audio:', error);
    showError('Audio processing failed. Please try again.');
  }

  processNextInQueue();
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
  `;
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  
  setTimeout(() => errorDiv.remove(), 3000);
}

chrome.storage.local.get(['enabled'], function(result) {
  if (result.enabled) {
    startProcessing();
  }
});