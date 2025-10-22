// Script to inject data into HomeEstimate page

// This script runs on HomeEstimate pages to inject extension data

console.log('HomeEstimate: Injector script loaded');

// Check if there's data to inject
chrome.storage.local.get(['homeEstimateData'], (result) => {
  if (result.homeEstimateData) {
    console.log('HomeEstimate: Found data to inject', result.homeEstimateData);

    // Save to localStorage for the app to pick up
    try {
      localStorage.setItem('homeEstimateExtensionData', JSON.stringify(result.homeEstimateData));

      // Clear from chrome storage
      chrome.storage.local.remove(['homeEstimateData']);

      // Dispatch custom event to notify the app
      window.dispatchEvent(new CustomEvent('homeEstimateDataReceived', {
        detail: result.homeEstimateData
      }));

      console.log('HomeEstimate: Data injected successfully');
    } catch (error) {
      console.error('HomeEstimate: Error injecting data', error);
    }
  }
});
