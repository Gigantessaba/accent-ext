import { state } from './state.js';
import { startProcessing } from './audio-processor.js';

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