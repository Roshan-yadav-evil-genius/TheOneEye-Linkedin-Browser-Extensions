// This file contains all shared constants used across the codebase

// Default threshold values for all categories
const DEFAULT_THRESHOLDS = {
  overallScore: 50,
  Profile: 50,
  Posts: 50,
  Reactions: 50,
  Comments: 50
};

// Array of all threshold category names (popup sliders)
const THRESHOLD_CATEGORIES = ['overallScore', 'Profile', 'Posts', 'Reactions', 'Comments'];

// API endpoint URL
const API_URL = 'http://4.240.102.231:7878/api/workflow/32499d7b-6861-409d-8337-C8c5eb6008bd/execute/';

// API request timeout (seconds)
const API_REQUEST_TIMEOUT = 300;
// const API_URL = 'http://4.240.102.231:7878/api/webhooks/IntentProfileScoringSystem/';

// Color constants for consistent styling
// Content script (overlay + rating UI) uses dark theme tokens (bgPrimary, bgSection, textPrimary, etc.)
// Popup uses inline styles that match these tokens
const COLORS = {
  success: '#10b981',
  error: '#ef4444',
  errorDark: '#dc2626',
  errorDarker: '#991b1b',
  primary: '#0C6DFD',
  primaryHover: '#0A5FD4',
  text: '#1f2937',
  textSecondary: '#374151',
  textMuted: '#6b7280',
  background: '#e5e7eb',
  white: '#ffffff',
  // Dark theme (content script overlay + rating UI; matches popup)
  bgPrimary: '#0A1128',
  bgSecondary: '#0F1729',
  bgSection: 'rgba(15, 23, 41, 0.6)',
  bgInput: 'rgba(10, 17, 40, 0.8)',
  borderLight: 'rgba(255, 255, 255, 0.1)',
  borderMedium: 'rgba(255, 255, 255, 0.2)',
  textPrimary: '#ffffff',
  textMutedDark: 'rgba(255, 255, 255, 0.7)',
  textPlaceholder: 'rgba(255, 255, 255, 0.5)',
  trackDark: 'rgba(255, 255, 255, 0.2)',
  shadowSection: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
};

// Animation and timing constants
const ANIMATION_DELAYS = {
  insertion: 500,
  urlChange: 1000,
  fetchDelay: 100,
  buttonReset: 1500
};
