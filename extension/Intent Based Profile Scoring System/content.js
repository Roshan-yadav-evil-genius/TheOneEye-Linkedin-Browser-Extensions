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
  const apiUrl = API_URL;

  const cacheEnabled = await getCacheState();
  if (cacheEnabled && !forceRefresh) {
    const cached = await getCachedResponse(currentUrl);
    if (cached) return { ...cached, fromCache: true };
  }

  try {
    const intent = await getIntent();
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { input: { url: currentUrl, intent: intent ?? '' } },
        timeout: API_REQUEST_TIMEOUT
      })
    });

    // Check HTTP status first - if not 200, show generic message
    if (response.status !== 200) {
      throw new Error('STATUS_NOT_200');
    }

    // Parse response JSON
    let apiResponse;
    try {
      apiResponse = await response.json();
    } catch (parseError) {
      // If response is not JSON, throw generic error
      throw new Error('STATUS_NOT_200');
    }

    // Check if API call was successful (check success flag)
    if (!apiResponse.success) {
      // Extract error message from API response (status is 200 but success is false)
      const errorMsg = apiResponse.error || 'API returned unsuccessful response';
      throw new Error(errorMsg);
    }

    // Check if output exists
    if (!apiResponse.output) {
      throw new Error('API response missing output data');
    }

    // Extract data from nested output structure
    const output = apiResponse.output;

    // Map API response to normalized format for UI
    const profileScore = Math.round((output.profile ?? 0) * 100);
    const activity = (output.activity || []).map(item => ({
      post_url: item.post_url,
      similarity: item.similarity,
      source: item.source
    }));
    const data = { profileScore, activity };
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

