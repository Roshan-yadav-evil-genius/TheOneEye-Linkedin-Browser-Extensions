// This file is responsible ONLY for checking if element exists and inserting it

// Flag to prevent multiple simultaneous insertions
let isInserting = false;

// Helper function to replace right widget in the analyzer section
function replaceRightWidget(newWidget) {
  const section = document.getElementById('TheOneEyeAnalyzer');
  if (!section) return;
  
  const card = section.querySelector('div');
  if (!card || card.children.length < 2) return;
  
  // Replace the second child (right column widget)
  const oldWidget = card.children[1];
  if (oldWidget && newWidget) {
    card.replaceChild(newWidget, oldWidget);
  }
}

// Helper function to replace entire card content (categories + right widget)
function replaceCardContent(newCardElement) {
  const section = document.getElementById('TheOneEyeAnalyzer');
  if (!section) return;
  
  const oldCard = section.querySelector('div');
  if (oldCard && newCardElement) {
    // Clone the new card to avoid issues
    const newCard = newCardElement.cloneNode(true);
    section.replaceChild(newCard, oldCard);
  }
}

const FOOTER_HIDDEN_CLASS = 'oneeye-overlay-footer-hidden';
const HEADER_BORDER_CACHED = 'oneeye-header-border-cached';
const HEADER_BORDER_FRESH = 'oneeye-header-border-fresh';

function setAnalyzerHeaderBorderState(state) {
  const header = document.querySelector('#TheOneEyeOverlay .oneeye-overlay-header');
  if (!header) return;
  header.classList.remove(HEADER_BORDER_CACHED, HEADER_BORDER_FRESH);
  if (state === 'cached') header.classList.add(HEADER_BORDER_CACHED);
  else if (state === 'fresh') header.classList.add(HEADER_BORDER_FRESH);
}

function showAnalyzerFooter(buttonLabel) {
  const footer = document.getElementById('TheOneEyeAnalyzerFooter');
  if (!footer) return;
  footer.classList.remove(FOOTER_HIDDEN_CLASS);
  const btn = document.getElementById('TheOneEyeRescoreRetryButton');
  if (btn) btn.textContent = buttonLabel;
}

function hideAnalyzerFooter() {
  const footer = document.getElementById('TheOneEyeAnalyzerFooter');
  if (footer) footer.classList.add(FOOTER_HIDDEN_CLASS);
}

// Flag to prevent multiple simultaneous fetches
let isFetching = false;

// Helper function to fetch data and show graph
// forceRefresh: when true (e.g. Rescore click), skip cache and request server; on success cache is overwritten
async function fetchAndShowGraph(forceRefresh = false) {
  // Prevent multiple simultaneous fetches
  if (isFetching) {
    return;
  }
  isFetching = true;
  
  const section = document.getElementById('TheOneEyeAnalyzer');
  if (!section) {
    isFetching = false;
    return;
  }
  
  // Show loading immediately so user never sees stale data (e.g. after profile navigation)
  const card = section.querySelector('div');
  const hasCenteredButton = card && card.querySelector('#analyze-profile-button');
  const hasCenteredLoading = card && card.querySelector('[data-oneeye-loading]');
  
  if (hasCenteredButton) {
    // Centered button state: Replace with centered loading
    const centeredLoading = createCenteredLoadingWidget();
    replaceCardContent(centeredLoading);
    hideAnalyzerFooter();
    setAnalyzerHeaderBorderState('default');
  } else if (!hasCenteredLoading && card) {
    // Already showing graph or error (e.g. navigated to different profile): show loading while fetching
    const centeredLoading = createCenteredLoadingWidget();
    replaceCardContent(centeredLoading);
    hideAnalyzerFooter();
    setAnalyzerHeaderBorderState('default');
  }
  
  try {
    // Fetch data (uses cache when cache enabled and !forceRefresh)
    const result = await fetchProfileData(forceRefresh ? { forceRefresh: true } : {});
    
    // Load thresholds
    const thresholds = await getThresholds();
    
    // Create complete graph with fetched data (result may include fromCache)
    const graphSection = createRatingBreakdownUI(result, thresholds);
    
    // Extract the card from the graph section
    const newCard = graphSection.querySelector('div');
    
    if (newCard) {
      // Replace entire card content (both categories and overall score)
      replaceCardContent(newCard);
      showAnalyzerFooter('Rescore');
      setAnalyzerHeaderBorderState(result.fromCache ? 'cached' : 'fresh');
    }
  } catch (error) {
    console.error('Error fetching profile data:', error);
    // Check if status is not 200 - show generic message
    let errorMessage;
    if (error.message === 'STATUS_NOT_200') {
      errorMessage = 'Contact TheOneEye team to get it fixed quick';
    } else {
      // Status is 200 but success is false - show actual error message
      errorMessage = error.message || 'Failed to fetch profile data. Please try again later.';
    }
    const errorWidget = createCenteredErrorWidget(errorMessage);
    replaceCardContent(errorWidget);
    showAnalyzerFooter('Retry');
    setAnalyzerHeaderBorderState('default');
  } finally {
    isFetching = false;
  }
}

async function insertAnalyzerSection() {
  // Check if analyzer section already exists (e.g. inside overlay)
  if (document.getElementById('TheOneEyeAnalyzer')) {
    return;
  }

  // Prevent multiple simultaneous insertions
  if (isInserting) {
    return;
  }
  isInserting = true;

  const openIcon = `<img src="${chrome.runtime.getURL('TheOneEye.png')}" alt="TheOneEye" width="24" height="24" style="object-fit: contain; pointer-events: none;">`;
  const closeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  function updateToggleIcon(overlayEl) {
    const toggle = document.querySelector('.oneeye-overlay-toggle');
    if (!toggle) return;
    const isClosed = overlayEl.classList.contains('oneeye-overlay-closed');
    toggle.innerHTML = isClosed ? openIcon : closeIcon;
    toggle.setAttribute('aria-label', isClosed ? 'Open sidebar' : 'Close sidebar');
    toggle.classList.toggle('panel-closed', isClosed);
  }

  // Get or create overlay on document.body (no dependency on LinkedIn DOM)
  let overlay = document.getElementById('TheOneEyeOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'TheOneEyeOverlay';

    const panel = document.createElement('div');
    panel.className = 'oneeye-overlay-panel';

    const header = document.createElement('div');
    header.className = 'oneeye-overlay-header';
    const headerLeft = document.createElement('div');
    headerLeft.className = 'oneeye-overlay-header-left';
    const headerLogo = createLogoImage(28, 'TheOneEye Logo');
    headerLogo.className = 'oneeye-overlay-header-logo';
    const headerTitle = document.createElement('h1');
    headerTitle.className = 'oneeye-overlay-header-title';
    headerTitle.textContent = 'TheOneEye';
    const headerMiddle = document.createElement('div');
    headerMiddle.className = 'oneeye-overlay-header-middle';
    headerMiddle.textContent = 'IntentProfileScoringSystem';
    headerLeft.appendChild(headerLogo);
    headerLeft.appendChild(headerTitle);
    header.appendChild(headerLeft);
    header.appendChild(headerMiddle);
    panel.appendChild(header);

    const inner = document.createElement('div');
    inner.className = 'oneeye-overlay-inner';

    const footer = document.createElement('div');
    footer.id = 'TheOneEyeAnalyzerFooter';
    footer.className = 'oneeye-overlay-footer ' + FOOTER_HIDDEN_CLASS;
    const rescoreRetryBtn = document.createElement('button');
    rescoreRetryBtn.id = 'TheOneEyeRescoreRetryButton';
    rescoreRetryBtn.type = 'button';
    rescoreRetryBtn.className = 'oneeye-overlay-footer-button';
    rescoreRetryBtn.textContent = 'Rescore';
    rescoreRetryBtn.addEventListener('click', () => {
      const sectionEl = document.getElementById('TheOneEyeAnalyzer');
      if (!sectionEl || isFetching) return;
      setAnalyzerHeaderBorderState('default');
      replaceCardContent(createCenteredLoadingWidget());
      hideAnalyzerFooter();
      fetchAndShowGraph(true);
    });
    footer.appendChild(rescoreRetryBtn);

    panel.appendChild(inner);
    panel.appendChild(footer);
    overlay.appendChild(panel);

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'oneeye-overlay-toggle';
    toggleBtn.type = 'button';
    toggleBtn.setAttribute('aria-label', 'Close sidebar');
    toggleBtn.innerHTML = closeIcon;
    toggleBtn.addEventListener('click', () => {
      overlay.classList.toggle('oneeye-overlay-closed');
      updateToggleIcon(overlay);
      if (!overlay.classList.contains('oneeye-overlay-closed')) {
        const sectionEl = document.getElementById('TheOneEyeAnalyzer');
        if (sectionEl && sectionEl.querySelector('#analyze-profile-button')) {
          fetchAndShowGraph();
        }
      }
    });

    document.body.appendChild(overlay);
    document.body.appendChild(toggleBtn);
  } else if (overlay && !document.querySelector('.oneeye-overlay-toggle')) {
    /* Overlay exists but toggle is missing (e.g. after code update); add toggle on body */
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'oneeye-overlay-toggle';
    toggleBtn.type = 'button';
    toggleBtn.setAttribute('aria-label', 'Close sidebar');
    toggleBtn.innerHTML = closeIcon;
    toggleBtn.addEventListener('click', () => {
      overlay.classList.toggle('oneeye-overlay-closed');
      updateToggleIcon(overlay);
      if (!overlay.classList.contains('oneeye-overlay-closed')) {
        const sectionEl = document.getElementById('TheOneEyeAnalyzer');
        if (sectionEl && sectionEl.querySelector('#analyze-profile-button')) {
          fetchAndShowGraph();
        }
      }
    });
    document.body.appendChild(toggleBtn);
    updateToggleIcon(overlay);
  }

  const inner = overlay.querySelector('.oneeye-overlay-inner') || overlay.querySelector('.oneeye-overlay-panel')?.firstElementChild;
  if (!inner) {
    isInserting = false;
    return;
  }

  // Check autoscore state and "show sidebar when autoscore" state
  const autoscoreEnabled = await getAutoscoreState();
  const autoscoreShowSidebar = await getAutoscoreShowSidebarState();

  // Load thresholds
  const thresholds = await getThresholds();

  // Create section and card (same structure as before)
  const section = document.createElement('section');
  section.id = 'TheOneEyeAnalyzer';

  let card;
  if (autoscoreEnabled) {
    const cacheOn = await getCacheState();
    const currentUrl = window.location.href;
    const cached = cacheOn ? await getCachedResponse(currentUrl) : null;
    if (cached) {
      const ratingData = { ...cached, fromCache: true };
      const graphSection = createRatingBreakdownUI(ratingData, thresholds);
      const newCard = graphSection.querySelector('div');
      card = newCard || createCenteredLoadingWidget();
      section.appendChild(card);
      inner.appendChild(section);
      showAnalyzerFooter('Rescore');
      setAnalyzerHeaderBorderState('cached');
    } else {
      card = createCenteredLoadingWidget();
      section.appendChild(card);
      inner.appendChild(section);
      fetchAndShowGraph();
    }
  } else {
    card = createCenteredAnalyzeButton();
    const button = card.querySelector('#analyze-profile-button');
    if (button) {
      button.addEventListener('click', () => {
        fetchAndShowGraph();
      });
    }
    section.appendChild(card);
    inner.appendChild(section);
  }

  // When autoscore is off, or when autoscore is on but "show sidebar" is off: start with panel closed
  const startPanelClosed = !autoscoreEnabled || (autoscoreEnabled && !autoscoreShowSidebar);
  if (startPanelClosed) {
    overlay.classList.add('oneeye-overlay-closed');
    updateToggleIcon(overlay);
  }

  isInserting = false;
}

