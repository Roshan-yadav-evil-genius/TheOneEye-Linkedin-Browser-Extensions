const EXTENSION_NAME = 'Intent Based Profile Scoring System';

// Report UI: toggle, close, submit
function toggleReportSection() {
  const reportSection = document.getElementById('reportSection');
  if (!reportSection) return;
  reportSection.style.display = reportSection.style.display === 'none' ? 'block' : 'none';
}

function closeReportSection() {
  const reportSection = document.getElementById('reportSection');
  if (reportSection) reportSection.style.display = 'none';
}

function setReportStatus(message, isError) {
  const el = document.getElementById('reportStatus');
  if (!el) return;
  el.textContent = message || '';
  el.className = 'report-status' + (isError ? ' error' : ' success');
  el.style.display = message ? 'block' : 'none';
  if (message && !isError) {
    setTimeout(() => setReportStatus('', false), 2000);
  }
}

async function onReportSubmit() {
  const reportDescription = document.getElementById('reportDescription');
  const description = reportDescription ? reportDescription.value.trim() : '';
  let pageUrl = '';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    pageUrl = (tab && tab.url) ? tab.url : '';
  } catch (_) {}
  await sendReport(pageUrl, description);
}

async function sendReport(pageUrl, description) {
  const reportSubmitBtn = document.getElementById('reportSubmitBtn');
  const reportDescription = document.getElementById('reportDescription');
  if (!reportSubmitBtn) return;
  reportSubmitBtn.disabled = true;
  setReportStatus('', false);
  const body = {
    input: {
      input: {
        post_url: pageUrl || '',
        issue_description: description || '',
        extension_name: EXTENSION_NAME,
        submitted_at: new Date().toISOString()
      }
    },
    timeout: 300
  };
  const { apiKey } = await chrome.storage.local.get(['apiKey']);
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = 'Api-Key ' + apiKey;
  try {
    const res = await fetch(REPORT_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Report failed');
    if (data.success !== true) throw new Error(data.error || 'Report failed');
    if (reportDescription) reportDescription.value = '';
    closeReportSection();
    setReportStatus('Report sent', false);
  } catch (err) {
    setReportStatus(err.message || 'Report failed', true);
  } finally {
    if (reportSubmitBtn) reportSubmitBtn.disabled = false;
  }
}

// API Key UI: load/save/logout + welcome
const AUTH_ME_URL = (typeof API_BASE !== 'undefined' ? API_BASE : 'http://127.0.0.1:7878') + '/api/auth/me/';

async function refreshApiKeyUI() {
  const apiKeyAuthRow = document.getElementById('apiKeyAuthRow');
  const apiKeyFormRow = document.getElementById('apiKeyFormRow');
  const apiKeyWelcomeEl = document.getElementById('apiKeyWelcome');
  const apiKeyInput = document.getElementById('apiKeyInput');
  if (!apiKeyAuthRow || !apiKeyFormRow) return;
  const { apiKey, userName } = await chrome.storage.local.get(['apiKey', 'userName']);
  if (apiKey) {
    apiKeyAuthRow.style.display = 'flex';
    apiKeyFormRow.style.display = 'none';
    if (apiKeyWelcomeEl) apiKeyWelcomeEl.textContent = userName ? 'Welcome, ' + userName : 'Welcome';
    if (apiKeyInput) { apiKeyInput.value = ''; apiKeyInput.placeholder = 'Enter API key'; }
  } else {
    apiKeyAuthRow.style.display = 'none';
    apiKeyFormRow.style.display = 'block';
    if (apiKeyInput) { apiKeyInput.value = ''; apiKeyInput.placeholder = 'Enter API key'; apiKeyInput.readOnly = false; }
  }
}

async function onApiKeySave() {
  const apiKeyInput = document.getElementById('apiKeyInput');
  const key = (apiKeyInput && apiKeyInput.value) ? apiKeyInput.value.trim() : '';
  if (!key) {
    setReportStatus('Enter an API key', true);
    return;
  }
  try {
    const res = await fetch(AUTH_ME_URL, { method: 'GET', headers: { 'Authorization': 'Api-Key ' + key } });
    if (!res.ok) {
      setReportStatus('Invalid API key', true);
      return;
    }
    const data = await res.json();
    const first = (data.first_name || '').trim();
    const last = (data.last_name || '').trim();
    const displayName = (first + ' ' + last).trim() || (data.username || '').trim() || 'User';
    await chrome.storage.local.set({ apiKey: key, userName: displayName });
    setReportStatus('', false);
    refreshApiKeyUI();
  } catch {
    setReportStatus('Invalid API key', true);
  }
}

function onApiKeyLogout() {
  chrome.storage.local.remove(['apiKey', 'userName'], () => {
    const apiKeyAuthRow = document.getElementById('apiKeyAuthRow');
    const apiKeyFormRow = document.getElementById('apiKeyFormRow');
    const apiKeyInput = document.getElementById('apiKeyInput');
    if (apiKeyAuthRow) apiKeyAuthRow.style.display = 'none';
    if (apiKeyFormRow) apiKeyFormRow.style.display = 'block';
    if (apiKeyInput) { apiKeyInput.value = ''; apiKeyInput.placeholder = 'Enter API key'; apiKeyInput.readOnly = false; }
  });
}

// Load current autoscore state, show-sidebar state, and intent
async function loadAutoscoreState() {
  try {
    const autoscoreEnabled = await getAutoscoreState();
    document.getElementById('autoscore-toggle').checked = autoscoreEnabled;
    updateStatusText(autoscoreEnabled);

    const showSidebar = await getAutoscoreShowSidebarState();
    const showSidebarToggle = document.getElementById('show-sidebar-toggle');
    if (showSidebarToggle) {
      showSidebarToggle.checked = showSidebar;
      setShowSidebarToggleState(autoscoreEnabled);
    }

    const cacheEnabled = await getCacheState();
    const cacheToggle = document.getElementById('cache-toggle');
    if (cacheToggle) cacheToggle.checked = cacheEnabled;
    
    // Load saved intent if exists
    const intent = await getIntent();
    if (intent) {
      document.getElementById('intent-textarea').value = intent;
    }
  } catch (error) {
    console.error('Error loading autoscore state:', error);
  }
}

// Enable/disable Show sidebar toggle based on autoscore (only applies when autoscore is on)
function setShowSidebarToggleState(autoscoreEnabled) {
  const showSidebarToggle = document.getElementById('show-sidebar-toggle');
  const showSidebarLabel = document.querySelector('.header-show-sidebar-label');
  if (showSidebarToggle && showSidebarLabel) {
    showSidebarToggle.disabled = !autoscoreEnabled;
    showSidebarLabel.style.opacity = autoscoreEnabled ? '1' : '0.5';
  }
}

// Update status text
function updateStatusText(enabled) {
  const statusText = document.getElementById('status-text');
  if (statusText) {
    if (enabled) {
      statusText.textContent = 'Autoscore is enabled';
      statusText.style.color = COLORS.success;
    } else {
      statusText.textContent = 'Autoscore is disabled';
      statusText.style.color = 'rgba(255, 255, 255, 0.7)';
    }
  }
}

// Handle autoscore toggle change - only update UI, don't save (Save button will save)
document.getElementById('autoscore-toggle').addEventListener('change', (e) => {
  const enabled = e.target.checked;
  updateStatusText(enabled);
  setShowSidebarToggleState(enabled);
});

// Collect all current threshold values
function collectThresholds() {
  const thresholds = {};
  
  THRESHOLD_CATEGORIES.forEach(category => {
    const slider = document.getElementById(`${category}-slider`);
    if (slider) {
      thresholds[category] = parseInt(slider.value, 10);
    }
  });
  
  return thresholds;
}

// Handle save button click - saves autoscore, thresholds, and intent
document.getElementById('save-button').addEventListener('click', async () => {
  const intentTextarea = document.getElementById('intent-textarea');
  const autoscoreToggle = document.getElementById('autoscore-toggle');
  const showSidebarToggle = document.getElementById('show-sidebar-toggle');
  const saveButton = document.getElementById('save-button');
  
  const intent = intentTextarea.value.trim();
  const autoscore = autoscoreToggle.checked;
  const showSidebar = showSidebarToggle ? showSidebarToggle.checked : true;
  const cacheToggle = document.getElementById('cache-toggle');
  const cacheEnabled = cacheToggle ? cacheToggle.checked : false;
  const thresholds = collectThresholds();
  
  try {
    // Store original button state
    const originalText = saveButton.textContent;
    const originalBgColor = saveButton.style.backgroundColor || COLORS.primary;
    
    // Disable button during save
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    
    // Save all data to storage
    await setAutoscoreState(autoscore);
    await setAutoscoreShowSidebarState(showSidebar);
    await setCacheState(cacheEnabled);
    await setThresholds(thresholds);
    await setIntent(intent);
    
    // Show success feedback
    saveButton.textContent = 'Saved!';
    saveButton.style.backgroundColor = COLORS.success;
    saveButton.disabled = false;
    
    // Reset after delay
    setTimeout(() => {
      saveButton.textContent = originalText;
      saveButton.style.backgroundColor = originalBgColor;
    }, ANIMATION_DELAYS.buttonReset);
  } catch (error) {
    console.error('Error saving settings:', error);
    alert('Error saving settings. Please try again.');
    saveButton.disabled = false;
    saveButton.textContent = 'Save';
    saveButton.style.backgroundColor = COLORS.primary;
  }
});

// Load threshold values from storage
async function loadThresholds() {
  try {
    const thresholds = await getThresholds();
    
    // Update all sliders and value displays
    THRESHOLD_CATEGORIES.forEach(category => {
      const slider = document.getElementById(`${category}-slider`);
      const valueDisplay = document.getElementById(`${category}-value`);
      if (slider && valueDisplay) {
        const value = thresholds[category] || DEFAULT_THRESHOLDS[category];
        slider.value = value;
        valueDisplay.textContent = value;
      }
    });
  } catch (error) {
    console.error('Error loading thresholds:', error);
  }
}

// Setup threshold slider event listeners - only update display, don't save (Save button will save)
function setupThresholdSliders() {
  THRESHOLD_CATEGORIES.forEach(category => {
    const slider = document.getElementById(`${category}-slider`);
    const valueDisplay = document.getElementById(`${category}-value`);
    
    if (slider && valueDisplay) {
      // Update display value as user drags (no auto-save)
      slider.addEventListener('input', (e) => {
        const value = e.target.value;
        valueDisplay.textContent = value;
      });
    }
  });
}

// Report button and section listeners
const reportBtn = document.getElementById('reportBtn');
const reportCloseBtn = document.getElementById('reportCloseBtn');
const reportSubmitBtn = document.getElementById('reportSubmitBtn');
if (reportBtn) reportBtn.addEventListener('click', toggleReportSection);
if (reportCloseBtn) reportCloseBtn.addEventListener('click', closeReportSection);
if (reportSubmitBtn) reportSubmitBtn.addEventListener('click', onReportSubmit);

const apiKeySaveBtn = document.getElementById('apiKeySaveBtn');
const apiKeyLogoutBtn = document.getElementById('apiKeyLogoutBtn');
if (apiKeySaveBtn) apiKeySaveBtn.addEventListener('click', onApiKeySave);
if (apiKeyLogoutBtn) apiKeyLogoutBtn.addEventListener('click', onApiKeyLogout);

// Load state when popup opens
refreshApiKeyUI();
loadAutoscoreState();
loadThresholds();
setupThresholdSliders();
