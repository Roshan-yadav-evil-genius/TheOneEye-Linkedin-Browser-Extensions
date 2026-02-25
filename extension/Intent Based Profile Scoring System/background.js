// Background service worker: queues profile-scoring requests and runs one fetch at a time.
// Sends QUEUE_STATUS (queued/processing) to tabs for informational loading UI.
// Keep IS_DEV / API_BASE in sync with config.js (service worker cannot load external scripts).
const IS_DEV = true;
const API_BASE = IS_DEV ? 'http://127.0.0.1:7878' : 'http://4.240.102.231:7878';
const API_URL = API_BASE + '/api/workflow/32499d7b-6861-409d-8337-C8c5eb6008bd/execute/';
const API_REQUEST_TIMEOUT = 300;

const requestQueue = [];
let isProcessing = false;

function sendQueueStatusToTab(tabId, status, position) {
  const payload = { type: 'QUEUE_STATUS', status };
  if (status === 'queued' && position != null) payload.position = position;
  chrome.tabs.sendMessage(tabId, payload).catch(() => {});
}

async function processOne(payload, sendResponse, tabId) {
  try {
    const body = {
      input: { input: { url: payload.url, intent: payload.intent ?? '' } },
      timeout: payload.timeout ?? API_REQUEST_TIMEOUT
    };
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (response.status !== 200) {
      sendResponse({ success: false, error: 'STATUS_NOT_200' });
      return;
    }

    let apiResponse;
    try {
      apiResponse = await response.json();
    } catch {
      sendResponse({ success: false, error: 'STATUS_NOT_200' });
      return;
    }

    if (!apiResponse.success) {
      const errorMsg = apiResponse.error || 'API returned unsuccessful response';
      sendResponse({ success: false, error: errorMsg });
      return;
    }

    if (!apiResponse.output) {
      sendResponse({ success: false, error: 'API response missing output data' });
      return;
    }

    const output = apiResponse.output;
    const profileScore = Math.round((output.profile ?? 0) * 100);
    const activity = (output.activity || []).map(item => ({
      post_url: item.post_url,
      similarity: item.similarity,
      source: item.source
    }));
    sendResponse({ success: true, data: { profileScore, activity } });
  } catch (error) {
    sendResponse({ success: false, error: error.message || 'Failed to fetch' });
  } finally {
    if (requestQueue.length > 0) {
      const next = requestQueue.shift();
      sendQueueStatusToTab(next.tabId, 'processing');
      // Update remaining queued tabs with their new position (count down as queue advances)
      requestQueue.forEach((item, index) => {
        sendQueueStatusToTab(item.tabId, 'queued', index + 1);
      });
      processOne(next.payload, next.sendResponse, next.tabId);
    } else {
      isProcessing = false;
    }
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'FETCH_PROFILE_DATA' || !message.payload || !sender.tab?.id) {
    return false;
  }

  const payload = message.payload;
  const tabId = sender.tab.id;
  if (typeof payload.url !== 'string' || typeof payload.intent !== 'string') {
    return false;
  }

  if (!isProcessing) {
    isProcessing = true;
    sendQueueStatusToTab(tabId, 'processing');
    processOne(payload, sendResponse, tabId);
  } else {
    requestQueue.push({ payload, sendResponse, tabId });
    sendQueueStatusToTab(tabId, 'queued', requestQueue.length);
  }

  return true;
});
