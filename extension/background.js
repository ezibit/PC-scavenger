chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ pcScavengerListings: [], pcScavengerLastCollected: null });
});
