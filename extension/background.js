// Background service worker
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await chrome.tabs.create({ url: 'onboarding.html' });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  try {
    const data = await chrome.storage.local.get(['quran_room_state_v1']);
    let state = data.quran_room_state_v1 || {};

    const today = new Date().toLocaleDateString('en-CA');
    const loggedToday = state.lastLoggedDate === today;
    const hasUrl = !!state.webAppUrl;

    // Open dashboard if setup incomplete or log pending
    if (!hasUrl || !loggedToday) {
      // Use chrome.windows.getAll to check if there are any windows
      const windows = await chrome.windows.getAll();
      if (windows.length > 0) {
        await chrome.tabs.create({ url: hasUrl ? "index.html" : "onboarding.html" });
      }
    }
  } catch (error) {
    // Silently handle startup errors (browser might not have windows yet)
    console.log('QuranRoom: Waiting for browser window...');
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkStatus") {
    chrome.storage.local.get(['quran_room_state_v1']).then(data => {
      const state = data.quran_room_state_v1 || {};
      const today = new Date().toLocaleDateString('en-CA');
      sendResponse({
        isLogged: state.lastLoggedDate === today,
        hasUrl: !!state.webAppUrl
      });
    });
    return true; // Keep channel open for async response
  }

  if (request.action === "refreshAllTabs") {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id && tab.url && !tab.url.startsWith('chrome://')) {
          chrome.tabs.sendMessage(tab.id, { action: "recheck" }).catch(() => {
            // Silently handle tabs that can't receive messages
          });
        }
      });
    });
    sendResponse({ status: "done" });
    return true;
  }

  return false;
});
