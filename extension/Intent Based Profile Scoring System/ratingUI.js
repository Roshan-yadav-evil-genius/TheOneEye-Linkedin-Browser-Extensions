// This file is responsible ONLY for creating the rating breakdown UI structure

// Creates a centered error widget for the entire card area
// Returns a card container with error message and TheOneEye logo
function createCenteredErrorWidget(errorMessage) {
  // Create main card container with semi-red background - maintain same height
  const card = document.createElement('div');
  card.style.cssText = `background-color: ${COLORS.bgSection}; padding: 16px; width: 100%; display: flex; align-items: center; justify-content: center; min-height: 200px; border-radius: 8px; border: 1px solid rgba(220, 38, 38, 0.3); box-shadow: ${COLORS.shadowSection};`;
  
  // Create centered error container
  const errorContainer = document.createElement('div');
  errorContainer.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; max-width: 500px;';
  
  // TheOneEye logo - smaller to maintain height
  const logo = createLogoImage(48, 'TheOneEye Logo');
  logo.style.marginBottom = '12px';
  
  // Error title
  const errorTitle = document.createElement('div');
  errorTitle.style.cssText = `color: ${COLORS.errorDark}; font-size: 20px; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.5px;`;
  errorTitle.textContent = 'Error';
  
  // Error message
  const errorText = document.createElement('div');
  errorText.style.cssText = `color: ${COLORS.errorDarker}; font-size: 15px; line-height: 1.5; word-wrap: break-word; font-weight: 500;`;
  errorText.textContent = errorMessage || 'An error occurred while fetching data.';
  
  errorContainer.appendChild(logo);
  errorContainer.appendChild(errorTitle);
  errorContainer.appendChild(errorText);
  card.appendChild(errorContainer);
  
  return card;
}

// Creates a centered loading widget for the entire card area
// Returns a card container with centered loading indicator
function createCenteredLoadingWidget() {
  // Create main card container matching graph structure
  const card = document.createElement('div');
  card.setAttribute('data-oneeye-loading', 'true');
  card.style.cssText = `background-color: ${COLORS.bgSection}; padding: 16px; width: 100%; display: flex; align-items: center; justify-content: center; min-height: 200px; border-radius: 8px; border: 1px solid ${COLORS.borderLight}; box-shadow: ${COLORS.shadowSection};`;
  
  // Create centered loading container using utility
  const loadingContainer = createSpinner(48, 'Loading...');
  card.appendChild(loadingContainer);
  const loadingTextEl = loadingContainer.querySelector('div:last-child');
  if (loadingTextEl) loadingTextEl.id = 'TheOneEyeLoadingMessage';

  return card;
}

// Creates a loading widget (spinner/skeleton) matching graph card dimensions
// Returns a container element with loading indicator (for right column only)
function createLoadingWidget() {
  const container = document.createElement('div');
  container.style.cssText = `background-color: ${COLORS.bgSection}; border-radius: 8px; box-shadow: ${COLORS.shadowSection}; border: 1px solid ${COLORS.borderLight}; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 180px; min-height: 166px;`;
  
  // Create spinner using utility
  const spinnerContainer = createSpinner(40, 'Loading...');
  container.appendChild(spinnerContainer);
  
  return container;
}

// Creates a centered analyze button widget for the entire card area
// Returns a card container with centered button
function createCenteredAnalyzeButton() {
  // Create main card container matching graph structure
  const card = document.createElement('div');
  card.style.cssText = `background-color: ${COLORS.bgSection}; padding: 16px; width: 100%; display: flex; align-items: center; justify-content: center; min-height: 200px; border-radius: 8px; border: 1px solid ${COLORS.borderLight}; box-shadow: ${COLORS.shadowSection};`;
  
  // Create centered button container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center;';
  
  const button = document.createElement('button');
  button.id = 'analyze-profile-button';
  button.style.cssText = `display: flex; align-items: center; gap: 12px; padding: 16px 32px; background-color: ${COLORS.primary}; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: background-color 0.3s ease; font-family: inherit;`;
  
  // Create logo image using utility
  const logo = createLogoImage(28, 'TheOneEye Logo');
  
  // Create text span
  const text = document.createElement('span');
  text.textContent = 'Analyze Profile';
  
  // Hover effect using utility
  addHoverEffect(button, COLORS.primary, COLORS.primaryHover);
  
  button.appendChild(logo);
  button.appendChild(text);
  buttonContainer.appendChild(button);
  card.appendChild(buttonContainer);
  
  return card;
}

// Creates the analyze button with TheOneEye logo and text
// Returns a button element that matches graph card dimensions (for right column only)
function createAnalyzeButton() {
  const container = document.createElement('div');
  container.style.cssText = `background-color: ${COLORS.bgSection}; border-radius: 8px; box-shadow: ${COLORS.shadowSection}; border: 1px solid ${COLORS.borderLight}; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 180px; min-height: 166px;`;
  
  const button = document.createElement('button');
  button.id = 'analyze-profile-button';
  button.style.cssText = `display: flex; align-items: center; gap: 12px; padding: 12px 24px; background-color: ${COLORS.primary}; color: white; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background-color 0.3s ease; font-family: inherit;`;
  
  // Create logo image using utility
  const logo = createLogoImage(24, 'TheOneEye Logo');
  
  // Create text span
  const text = document.createElement('span');
  text.textContent = 'Analyze Profile';
  
  // Hover effect using utility
  addHoverEffect(button, COLORS.primary, COLORS.primaryHover);
  
  button.appendChild(logo);
  button.appendChild(text);
  container.appendChild(button);
  
  return container;
}

// Creates a single vertical bar graph with label
// Takes label (string), percent (number 0-100), and threshold (number 0-100) and returns a complete bar graph element
function createBarGraph(label, percent, threshold = 50) {
  // Group container for bar and label
  const categoryItem = document.createElement('div');
  categoryItem.style.cssText = 'display: flex; flex-direction: column; align-items: center; width: auto; min-width: 0; height: 100%;';

  // Percent text on top of bar
  const percentText = document.createElement('div');
  percentText.style.cssText = `color: ${COLORS.textPrimary}; font-size: 11px; font-weight: 600; margin-bottom: 4px; height: 16px; display: flex; align-items: center;`;
  percentText.textContent = `${percent}%`;

  // Progress bar container (vertical) - slim bars
  // Use fixed height that matches available space: container min-height (166px) - padding (40px) - percent text (16px) - label space (~10px) = ~100px
  const progressContainer = document.createElement('div');
  progressContainer.style.cssText = `width: 20px; height: 100px; background-color: ${COLORS.trackDark}; border-radius: 2px 2px 0 0; overflow: hidden; display: flex; align-items: flex-end; flex-shrink: 0;`;

  // Determine color based on threshold comparison using utility
  const barColor = getColorByThreshold(percent, threshold);

  // Progress fill (vertical bar) - slim
  const progressFill = document.createElement('div');
  progressFill.style.cssText = `width: 100%; background-color: ${barColor}; border-radius: 2px 2px 0 0; height: ${percent}%; transition: height 0.3s ease, background-color 0.3s ease; min-height: ${percent > 0 ? '2px' : '0'};`;

  // Label below the bar - proper flex for full text
  const labelElement = document.createElement('span');
  labelElement.style.cssText = `color: ${COLORS.textMutedDark}; font-size: 11px; font-weight: 500; margin-top: 4px; text-align: center; word-wrap: break-word; width: 100%; min-width: 0; line-height: 1.2;`;
  labelElement.textContent = label;

  // Assemble progress bar
  progressContainer.appendChild(progressFill);

  // Assemble category item - percent, bar and label grouped together
  categoryItem.appendChild(percentText);
  categoryItem.appendChild(progressContainer);
  categoryItem.appendChild(labelElement);

  return categoryItem;
}

// Creates the SVG semicircular progress gauge
// Takes percent (number 0-100) and threshold (number 0-100) and returns SVG element with background and progress arcs
function createSemicircularGauge(percent, threshold = 50) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '140');
  svg.setAttribute('height', '80');
  svg.setAttribute('viewBox', '0 0 140 80');
  svg.style.cssText = 'position: absolute; top: 0; left: 0;';

  const radius = 60;
  const centerX = 70; // Center horizontally in 140px width
  // For a semicircle curving upward, we need to flip the y-coordinate
  // The visual center of the semicircle should be around y=50 (middle of 80px height)
  // Top of arc at y=20, bottom at y=80
  const visualCenterY = 50; // Visual center of the semicircle
  
  // Angles: 180° = left, 90° = top, 0° = right
  // For SVG (y increases downward), we need to invert y: y = centerY - radius*sin(angle)
  const startAngleDeg = 180; // Start from left (180°)
  const endAngleDeg = 0;     // End at right (0°)
  
  // Convert to radians for calculations
  const startAngleRad = (startAngleDeg * Math.PI) / 180;
  const endAngleRad = (endAngleDeg * Math.PI) / 180;
  
  // For a semicircle curving upward in SVG (y increases downward):
  // - Bottom edge is at y=80 (viewBox height)
  // - Top of arc is at y=20 (80 - radius)
  // - Center of full circle is at y=80 (the flat edge)
  const centerY = 80; // Bottom edge (flat part of semicircle)
  
  // Calculate points: x uses cos normally, y is inverted (subtract sin to curve upward)
  // At 180°: (10, 80) - left bottom
  // At 90°: (70, 20) - top center  
  // At 0°: (130, 80) - right bottom
  const startX = centerX + radius * Math.cos(startAngleRad);
  const startY = centerY - radius * Math.sin(startAngleRad); // Invert y to curve upward
  
  const endX = centerX + radius * Math.cos(endAngleRad);
  const endY = centerY - radius * Math.sin(endAngleRad); // Invert y to curve upward
  
  // Background arc (unfilled portion) - full semicircle
  const backgroundArc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const backgroundPath = `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`;
  backgroundArc.setAttribute('d', backgroundPath);
  backgroundArc.setAttribute('stroke', COLORS.trackDark);
  backgroundArc.setAttribute('stroke-width', '12');
  backgroundArc.setAttribute('fill', 'none');
  backgroundArc.setAttribute('stroke-linecap', 'round');

  // Progress arc (filled portion) - based on percentage
  const progressArc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  
  // Calculate progress angle: interpolate from startAngle to endAngle
  // For 0%: at startAngle (180°), for 100%: at endAngle (0°)
  // For 50%: should be at 90° (center top)
  const totalAngleDiff = startAngleDeg - endAngleDeg; // 180° - 0° = 180°
  const progressAngleDeg = startAngleDeg - (totalAngleDiff * percent / 100);
  const progressAngleRad = (progressAngleDeg * Math.PI) / 180;
  
  // Use same coordinate system: invert y to curve upward
  const progressEndX = centerX + radius * Math.cos(progressAngleRad);
  const progressEndY = centerY - radius * Math.sin(progressAngleRad); // Invert y to curve upward
  
  // For SVG arc: large-arc-flag is 0 for small arc, 1 for large arc
  // We always use small arc (0) for the direct clockwise path from start to progress end
  // The large arc would go the long way around (270° instead of 90°)
  const largeArcFlag = 0; // Always use small arc for direct path
  
  // Determine color based on threshold comparison using utility
  const gaugeColor = getColorByThreshold(percent, threshold);
  
  const progressPath = `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${progressEndX} ${progressEndY}`;
  progressArc.setAttribute('d', progressPath);
  progressArc.setAttribute('stroke', gaugeColor);
  progressArc.setAttribute('stroke-width', '12');
  progressArc.setAttribute('fill', 'none');
  progressArc.setAttribute('stroke-linecap', 'round');

  svg.appendChild(backgroundArc);
  svg.appendChild(progressArc);

  return svg;
}

// Creates the gauge container with SVG and percentage text
// Takes percent (number 0-100) and threshold (number 0-100) and returns the complete gauge container element
function createGaugeContainer(percent, threshold = 50) {
  const gaugeContainer = document.createElement('div');
  gaugeContainer.style.cssText = 'position: relative; width: 140px; height: 80px; margin-bottom: 12px;';

  // Add SVG gauge
  const svg = createSemicircularGauge(percent, threshold);
  gaugeContainer.appendChild(svg);

  // Percentage text centered in the semicircle
  // The semicircle center is at y=80 (bottom), radius=60, so visual center is at y=50 (halfway between top at y=20 and bottom at y=80)
  const percentageText = document.createElement('div');
  percentageText.style.cssText = `position: absolute; top: 50px; left: 50%; transform: translateX(-50%); font-size: 32px; font-weight: 700; color: ${COLORS.textPrimary}; text-align: center;`;
  percentageText.textContent = `${percent}%`;
  gaugeContainer.appendChild(percentageText);

  return gaugeContainer;
}

// Creates the complete overall score card
// Takes percent (number 0-100) and threshold (number 0-100) and returns the complete card element
function createOverallScoreCard(percent, threshold = 50) {
  const card = document.createElement('div');
  card.style.cssText = `background-color: ${COLORS.bgSection}; border-radius: 8px; box-shadow: ${COLORS.shadowSection}; border: 1px solid ${COLORS.borderLight}; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; width: 100%; min-width: 0; box-sizing: border-box;`;

  // Title
  const title = document.createElement('div');
  title.style.cssText = `color: ${COLORS.textPrimary}; font-size: 18px; font-weight: 600; margin-bottom: 16px; text-align: center;`;
  title.textContent = 'Overall Score';

  // Gauge container
  const gaugeContainer = createGaugeContainer(percent, threshold);

  // Assemble card
  card.appendChild(title);
  card.appendChild(gaugeContainer);

  return card;
}

function createRatingBreakdownUI(data, thresholds = {}) {
  // Merge provided thresholds with defaults
  const mergedThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  
  // Create main section
  const section = document.createElement('section');
  section.id = 'TheOneEyeAnalyzer';

  // Card container: column layout — Overall Score on top, then bar graphs below
  const card = document.createElement('div');
  card.style.cssText = `background-color: ${COLORS.bgSection}; padding: 16px; width: 100%; display: flex; flex-direction: column; gap: 16px; align-items: stretch; border-radius: 8px; border: 1px solid ${COLORS.borderLight}; box-shadow: ${COLORS.shadowSection};`;

  const overallScoreThreshold = mergedThresholds.overallScore ?? DEFAULT_THRESHOLDS.overallScore;
  const profileThreshold = mergedThresholds.Profile ?? DEFAULT_THRESHOLDS.Profile;

  const activityList = data.activity || [];
  const activitySum = activityList.reduce(
    (sum, item) => sum + (typeof item.similarity === 'number' ? item.similarity * 100 : 0),
    0
  );
  const totalCount = 1 + activityList.length;
  const overallScore = totalCount > 0
    ? Math.round((data.profileScore + activitySum) / totalCount)
    : data.profileScore;

  // Map activity source from API (e.g. post, reaction, comment) to threshold key
  function getThresholdForSource(source) {
    const key = { post: 'Posts', reaction: 'Reactions', comment: 'Comments' }[(source || '').toLowerCase()];
    return key ? (mergedThresholds[key] ?? DEFAULT_THRESHOLDS[key]) : 50;
  }

  const overallScoreCard = createOverallScoreCard(overallScore, overallScoreThreshold);
  const overallScoreWrapper = document.createElement('div');
  overallScoreWrapper.style.cssText = 'width: 100%; min-width: 0;';
  overallScoreWrapper.appendChild(overallScoreCard);

  // Bars container - horizontal layout for Profile bar + activity bars
  const barsContainer = document.createElement('div');
  barsContainer.style.cssText = `display: flex; align-items: flex-end; gap: 8px; min-height: 166px; justify-content: space-between; width: 100%; min-width: 0; background-color: ${COLORS.bgSection}; border-radius: 8px; box-shadow: ${COLORS.shadowSection}; border: 1px solid ${COLORS.borderLight}; padding: 20px; box-sizing: border-box;`;

  const profileBar = createBarGraph('Profile', data.profileScore, profileThreshold);
  barsContainer.appendChild(profileBar);
  activityList.forEach(item => {
    const label = item.source ? item.source.charAt(0).toUpperCase() + item.source.slice(1) : 'Activity';
    const percent = typeof item.similarity === 'number' ? Math.round(item.similarity * 100) : 0;
    const barThreshold = getThresholdForSource(item.source);
    const barGraph = createBarGraph(label, percent, barThreshold);
    barsContainer.appendChild(barGraph);
  });

  // Activity links card - source name + link for each scored post (below graphs)
  const activityLinksCard = document.createElement('div');
  activityLinksCard.style.cssText = `background-color: ${COLORS.bgSection}; border-radius: 8px; box-shadow: ${COLORS.shadowSection}; border: 1px solid ${COLORS.borderLight}; padding: 20px; box-sizing: border-box; width: 100%; min-width: 0; display: flex; flex-direction: column;`;
  const activityLinksTitle = document.createElement('div');
  activityLinksTitle.style.cssText = `color: ${COLORS.textPrimary}; font-size: 14px; font-weight: 600; margin-bottom: 12px;`;
  activityLinksTitle.textContent = '🏆 Scored posts';
  activityLinksCard.appendChild(activityLinksTitle);
  const sourceEmojis = { post: '📝', reaction: '👍', comment: '💬' };
  const sourceLinkText = {
    post: 'Post uploaded by prospect',
    reaction: 'Prospect reacted on',
    comment: 'Prospect commented on'
  };
  const activityLinksList = document.createElement('div');
  activityLinksList.style.cssText = 'display: flex; flex-direction: column; gap: 8px; overflow-y: auto; flex: 1; min-height: 0;';
  activityList.forEach(item => {
    const sourceKey = (item.source || '').toLowerCase();
    const sourceLabel = item.source ? item.source.charAt(0).toUpperCase() + item.source.slice(1) : 'Activity';
    const emoji = sourceEmojis[sourceKey] || '🔗';
    const url = item.post_url || '';
    const linkText = sourceLinkText[sourceKey] || 'View activity';
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; flex-wrap: nowrap; align-items: center; gap: 6px; font-size: 12px; min-width: 0;';
    const labelPart = document.createElement('span');
    labelPart.style.cssText = `font-weight: 600; color: ${COLORS.textMutedDark}; flex-shrink: 0;`;
    labelPart.textContent = `${emoji} ${sourceLabel}:`;
    row.appendChild(labelPart);
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.style.cssText = `color: ${COLORS.primary}; text-decoration: none; min-width: 0;`;
      link.textContent = linkText;
      link.title = url;
      row.appendChild(link);
    } else {
      const noLink = document.createElement('span');
      noLink.style.cssText = `color: ${COLORS.textPlaceholder};`;
      noLink.textContent = '—';
      row.appendChild(noLink);
    }
    activityLinksList.appendChild(row);
  });
  if (activityList.length === 0) {
    const empty = document.createElement('span');
    empty.style.cssText = `font-size: 12px; color: ${COLORS.textPlaceholder};`;
    empty.textContent = 'No activity links';
    activityLinksList.appendChild(empty);
  }
  activityLinksCard.appendChild(activityLinksList);

  card.appendChild(overallScoreWrapper);
  card.appendChild(barsContainer);
  card.appendChild(activityLinksCard);

  // Assemble section
  section.appendChild(card);

  return section;
}
