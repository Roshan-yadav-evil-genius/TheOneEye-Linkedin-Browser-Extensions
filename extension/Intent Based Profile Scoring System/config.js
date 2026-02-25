// Single place to switch dev vs prod. Flip IS_DEV when testing locally.
// Keep in sync with background.js (service worker cannot load this file).
var IS_DEV = false;
var API_BASE = IS_DEV ? 'http://127.0.0.1:7878' : 'http://4.240.102.231:7878';
