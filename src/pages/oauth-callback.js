import jwt_decode from 'jwt-decode';

(async () => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');

  // ✅ FIX: Use the state we stored during oauthStart (not Microsoft's)
  const state = sessionStorage.getItem('oauth_state');

  if (!code || !state) {
    console.error('Missing code or state in OAuth callback!', { code, state });
    return;
  }

  const res = await fetch('/.netlify/functions/tokenExchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, state }), // ✅ Now always correct
  });

  const tokenData = await res.json();

  if (tokenData.error) {
    console.error('❌ Token exchange failed:', tokenData.error);
    return;
  }

  const user = jwt_decode(tokenData.tokens.id_token);
  console.log('✅ Logged in user:', {
    name: user.name,
    email: user.email || user.preferred_username,
  });

  // ✅ Optional: Clean up state to prevent reuse
  sessionStorage.removeItem('oauth_state');

  // Optional: redirect to dashboard or store token
  // window.location.href = '/dashboard.html';
})();
