// This file is responsible for initialization and observers

// Check if we're on a LinkedIn profile page
function isProfilePage() {
  return window.location.pathname.includes('/in/');
}

// Fetch profile data from API (or from cache when enabled and not forceRefresh)
// options.forceRefresh: when true (e.g. Rescore click), skip cache and overwrite on success
// Returns a Promise that resolves with rating data
async function fetchProfileData(options = {}) {
  const forceRefresh = options.forceRefresh === true;
  const currentUrl = window.location.href;

  const cacheEnabled = await getCacheState();
  if (cacheEnabled && !forceRefresh) {
    const cached = await getCachedResponse(currentUrl);
    if (cached) return { ...cached, fromCache: true };
  }

  try {
    const intent = await getIntent();
    const response = await chrome.runtime.sendMessage({
      type: 'FETCH_PROFILE_DATA',
      payload: {
        url: currentUrl,
        intent: intent ?? '',
        timeout: API_REQUEST_TIMEOUT
      }
    });

    if (response === undefined) {
      throw new Error('Failed to fetch');
    }
    if (response.success === false) {
      throw new Error(response.error);
    }

    const data = response.data;
    updateAnalyzerLoadingMessage('Response received, storing in cache...');
    if (cacheEnabled) await setCachedResponse(currentUrl, data);
    return { ...data, fromCache: false };
  } catch (error) {
    console.error('Error fetching profile data from API:', error);
    // Re-throw error with message so it can be displayed
    throw error;
  }
}

// Initialize function
function init() {
  if (isProfilePage()) {
    // Try to insert after a short delay to ensure DOM is ready
    setTimeout(() => {
      if (!document.getElementById('TheOneEyeAnalyzer')) {
        insertAnalyzerSection();
      }
    }, ANIMATION_DELAYS.insertion);
  }
}

// Run on initial load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Re-insert overlay only if it was removed from body (not if user closed it)
window.oneeyeUserClosedOverlay = false;
let overlayReinsertTimeout;
const overlayObserver = new MutationObserver(() => {
  if (
    isProfilePage() &&
    !document.getElementById('TheOneEyeOverlay') &&
    !window.oneeyeUserClosedOverlay
  ) {
    clearTimeout(overlayReinsertTimeout);
    overlayReinsertTimeout = setTimeout(() => {
      insertAnalyzerSection();
    }, ANIMATION_DELAYS.insertion);
  }
});

overlayObserver.observe(document.body, {
  childList: true,
  subtree: false
});

// Handle navigation (LinkedIn SPA)
let lastUrl = location.href;
let urlChangeTimeout;
const urlObserver = new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    window.oneeyeUserClosedOverlay = false;
    clearTimeout(urlChangeTimeout);
    urlChangeTimeout = setTimeout(() => {
      if (!isProfilePage()) return;
      const analyzer = document.getElementById('TheOneEyeAnalyzer');
      if (analyzer) {
        // Same profile page, different URL (navigated to another prospect) — refresh score for new profile
        fetchAndShowGraph(false);
      } else {
        insertAnalyzerSection();
      }
    }, ANIMATION_DELAYS.urlChange);
  }
});

urlObserver.observe(document, { subtree: true, childList: true });

// Listen for queue status updates from background (one-way; no sendResponse)
chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== 'QUEUE_STATUS') return;
  if (message.status === 'queued') {
    updateAnalyzerLoadingMessage('Your request is in queue (position ' + message.position + ').');
  } else if (message.status === 'processing') {
    updateAnalyzerLoadingMessage('Processing your request...');
  }
});

