// This file is responsible ONLY for Chrome storage operations

// Generic function to get a storage item with error handling
async function getStorageItem(key) {
  try {
    const result = await chrome.storage.local.get([key]);
    return result[key];
  } catch (error) {
    console.error(`Error getting storage item ${key}:`, error);
    return undefined;
  }
}

// Generic function to set a storage item with error handling
async function setStorageItem(key, value) {
  try {
    await chrome.storage.local.set({ [key]: value });
    return true;
  } catch (error) {
    console.error(`Error setting storage item ${key}:`, error);
    return false;
  }
}

// Load thresholds from storage, merging with defaults
async function getThresholds() {
  let thresholds = { ...DEFAULT_THRESHOLDS };
  
  try {
    const result = await chrome.storage.local.get(['thresholds']);
    if (result.thresholds) {
      thresholds = { ...thresholds, ...result.thresholds };
    }
  } catch (error) {
    console.error('Error loading thresholds:', error);
  }
  
  return thresholds;
}

// Save thresholds to storage
async function setThresholds(thresholds) {
  try {
    await chrome.storage.local.set({ thresholds: thresholds });
    return true;
  } catch (error) {
    console.error('Error saving thresholds:', error);
    return false;
  }
}

// Load autoscore state from storage
async function getAutoscoreState() {
  try {
    const result = await chrome.storage.local.get(['autoscore']);
    return result.autoscore || false;
  } catch (error) {
    console.error('Error loading autoscore state:', error);
    return false;
  }
}

// Save autoscore state to storage
async function setAutoscoreState(enabled) {
  return setStorageItem('autoscore', enabled);
}

// Load "show sidebar when autoscore" state (only applies when autoscore is on). Default true.
async function getAutoscoreShowSidebarState() {
  try {
    const result = await chrome.storage.local.get(['autoscoreShowSidebar']);
    return result.autoscoreShowSidebar !== false;
  } catch (error) {
    console.error('Error loading autoscore show sidebar state:', error);
    return true;
  }
}

// Save "show sidebar when autoscore" state
async function setAutoscoreShowSidebarState(enabled) {
  return setStorageItem('autoscoreShowSidebar', enabled);
}

// Load intent text from storage
async function getIntent() {
  try {
    const result = await chrome.storage.local.get(['intent']);
    return result.intent || '';
  } catch (error) {
    console.error('Error loading intent:', error);
    return '';
  }
}

// Save intent text to storage
async function setIntent(intent) {
  return setStorageItem('intent', intent);
}

// Normalize profile URL for cache key (strip query, hash, trailing slash)
function normalizeProfileUrl(url) {
  try {
    const u = new URL(url);
    u.search = '';
    u.hash = '';
    let path = u.pathname.replace(/\/$/, '') || '/';
    return u.origin + path;
  } catch {
    return url;
  }
}

// Load cache (use cache) state from storage. Default false.
async function getCacheState() {
  try {
    const result = await chrome.storage.local.get(['cacheEnabled']);
    return result.cacheEnabled === true;
  } catch (error) {
    console.error('Error loading cache state:', error);
    return false;
  }
}

// Save cache (use cache) state
async function setCacheState(enabled) {
  return setStorageItem('cacheEnabled', enabled);
}

const SCORE_CACHE_KEY = 'scoreCache';
const CACHE_MAX_ENTRIES = 100;

// Get cached score response for a profile URL, or null if missing
async function getCachedResponse(url) {
  try {
    const result = await chrome.storage.local.get([SCORE_CACHE_KEY]);
    const cache = result[SCORE_CACHE_KEY] || {};
    const key = normalizeProfileUrl(url);
    return cache[key] ?? null;
  } catch (error) {
    console.error('Error reading score cache:', error);
    return null;
  }
}

// Store score response for a profile URL (overwrites existing for that URL)
async function setCachedResponse(url, data) {
  try {
    const result = await chrome.storage.local.get([SCORE_CACHE_KEY]);
    const cache = result[SCORE_CACHE_KEY] || {};
    const key = normalizeProfileUrl(url);
    cache[key] = data;
    const keys = Object.keys(cache);
    if (keys.length > CACHE_MAX_ENTRIES) {
      const toRemove = keys.length - CACHE_MAX_ENTRIES;
      for (let i = 0; i < toRemove; i++) delete cache[keys[i]];
    }
    await chrome.storage.local.set({ [SCORE_CACHE_KEY]: cache });
    return true;
  } catch (error) {
    console.error('Error writing score cache:', error);
    return false;
  }
}
