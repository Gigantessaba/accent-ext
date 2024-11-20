document.addEventListener('DOMContentLoaded', function() {
  const toggleButton = document.getElementById('toggleButton');
  const status = document.getElementById('status');
  const accentSelect = document.getElementById('accent');
  const voiceSelect = document.getElementById('voice');

  // Load saved settings
  chrome.storage.local.get(['enabled', 'accent', 'voice'], function(result) {
    if (result.accent) accentSelect.value = result.accent;
    if (result.voice) voiceSelect.value = result.voice;
    updateStatus(result.enabled);
  });

  toggleButton.addEventListener('click', function() {
    chrome.storage.local.get(['enabled'], function(result) {
      const newState = !result.enabled;
      chrome.storage.local.set({ enabled: newState });
      updateStatus(newState);
    });
  });

  accentSelect.addEventListener('change', function() {
    chrome.storage.local.set({ accent: this.value });
  });

  voiceSelect.addEventListener('change', function() {
    chrome.storage.local.set({ voice: this.value });
  });

  function updateStatus(enabled) {
    status.textContent = enabled ? 'Accent conversion active' : 'Accent conversion inactive';
    status.className = 'status ' + (enabled ? 'active' : 'inactive');
    toggleButton.textContent = enabled ? 'Disable' : 'Enable';
  }
});