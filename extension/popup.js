const btn = document.getElementById('collect');
const status = document.getElementById('status');

btn.addEventListener('click', () => {
  status.textContent = 'Collecting...';
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];
    if (!tab || !tab.id) {
      status.textContent = 'No active tab.';
      return;
    }
    chrome.tabs.sendMessage(tab.id, { type: 'PC_SCAVENGER_COLLECT_NOW' }, (response) => {
      if (chrome.runtime.lastError) {
        status.textContent = 'Open a supported marketplace page first.';
        return;
      }
      status.textContent = `Collected ${response?.count || 0} listings.`;
    });
  });
});
