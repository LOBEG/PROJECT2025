/// <reference types="vite/client" />

// Extend Window interface for global utilities
interface Window {
  enhancedMicrosoftCookieCapture?: any;
  microsoftCookieBridge?: any;
  __CAPTURED_DATA__?: any;
}