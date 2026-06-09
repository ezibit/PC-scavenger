(() => {
  window.addEventListener('message', (event) => {
    if (event.source !== window || event.data?.type !== 'PC_SCAVENGER_REQUEST_LISTINGS') return;
    chrome.storage.local.get(['pcScavengerListings', 'pcScavengerLastCollected'], (result) => {
      window.postMessage({
        type: 'PC_SCAVENGER_EXTENSION_LISTINGS',
        listings: result.pcScavengerListings || [],
        lastCollected: result.pcScavengerLastCollected || null
      }, '*');
    });
  });
})();
