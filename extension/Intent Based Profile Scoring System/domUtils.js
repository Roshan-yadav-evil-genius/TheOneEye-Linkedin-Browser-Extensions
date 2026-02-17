// This file is responsible ONLY for DOM manipulation and element creation utilities

// Create a DOM element with optional styles and children
function createElement(tag, styles = {}, children = []) {
  const element = document.createElement(tag);
  
  // Apply styles if provided
  if (styles && Object.keys(styles).length > 0) {
    const styleString = Object.entries(styles)
      .map(([key, value]) => {
        // Convert camelCase to kebab-case
        const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `${kebabKey}: ${value}`;
      })
      .join('; ');
    element.style.cssText = styleString;
  }
  
  // Append children if provided
  if (Array.isArray(children)) {
    children.forEach(child => {
      if (child instanceof Node) {
        element.appendChild(child);
      }
    });
  } else if (children instanceof Node) {
    element.appendChild(children);
  }
  
  return element;
}

// Create a logo image element with consistent styling
function createLogoImage(size = 48, altText = 'TheOneEye Logo') {
  const logo = document.createElement('img');
  logo.src = chrome.runtime.getURL('TheOneEye.png');
  logo.alt = altText;
  logo.style.cssText = `width: ${size}px; height: ${size}px; object-fit: contain;`;
  return logo;
}

// Ensure spinner animation CSS exists (idempotent)
function ensureSpinnerAnimation() {
  if (!document.getElementById('spinner-animation')) {
    const style = document.createElement('style');
    style.id = 'spinner-animation';
    style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  }
}

// Create a spinner element with consistent styling
function createSpinner(size = 40, text = 'Loading...') {
  ensureSpinnerAnimation();
  
  const container = document.createElement('div');
  container.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center;';
  
  const spinner = document.createElement('div');
  spinner.style.cssText = `width: ${size}px; height: ${size}px; border: 4px solid ${COLORS.trackDark}; border-top: 4px solid ${COLORS.primary}; border-radius: 50%; animation: spin 1s linear infinite;`;
  
  if (text) {
    const loadingText = document.createElement('div');
    loadingText.style.cssText = `margin-top: 16px; color: ${COLORS.textMutedDark}; font-size: ${size === 40 ? '14px' : '16px'}; font-weight: 500;`;
    loadingText.textContent = text;
    container.appendChild(spinner);
    container.appendChild(loadingText);
  } else {
    container.appendChild(spinner);
  }
  
  return container;
}

// Add hover effect to a button element
function addHoverEffect(element, defaultColor = COLORS.primary, hoverColor = COLORS.primaryHover) {
  element.addEventListener('mouseenter', () => {
    element.style.backgroundColor = hoverColor;
  });
  element.addEventListener('mouseleave', () => {
    element.style.backgroundColor = defaultColor;
  });
}

// Determine color based on threshold comparison
function getColorByThreshold(value, threshold = 50) {
  return value >= threshold ? COLORS.success : COLORS.error;
}
