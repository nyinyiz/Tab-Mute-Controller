// background.js — Service Worker
// Manages badge count and auto-mute rules

async function updateBadge() {
  try {
    const audibleTabs = await chrome.tabs.query({ audible: true, muted: false });
    const count = audibleTabs.length;
    const text = count > 0 ? String(count) : '';

    await chrome.action.setBadgeText({ text });
    if (text) {
      await chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    }
  } catch (e) {
    // Service worker may not have full context on startup
  }
}

async function checkAutoMute(tabId, url) {
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) return;

  try {
    const { autoMuteDomains = [] } = await chrome.storage.sync.get('autoMuteDomains');
    if (!autoMuteDomains.length) return;

    const hostname = new URL(url).hostname.replace(/^www\./, '');
    const shouldMute = autoMuteDomains.some(
      domain => hostname === domain || hostname.endsWith('.' + domain)
    );

    if (shouldMute) {
      await chrome.tabs.update(tabId, { muted: true });
    }
  } catch (e) {
    // Ignore URL parsing errors or invalid tab states
  }
}

// Listen for audio/mute state changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if ('audible' in changeInfo || 'mutedInfo' in changeInfo) {
    await updateBadge();
  }

  // Auto-mute: check domain when tab finishes loading
  if (changeInfo.status === 'complete' && tab.url) {
    await checkAutoMute(tabId, tab.url);
  }
});

chrome.tabs.onRemoved.addListener(() => updateBadge());

// Initialize badge on install and browser startup
chrome.runtime.onInstalled.addListener(() => updateBadge());
chrome.runtime.onStartup.addListener(() => updateBadge());
