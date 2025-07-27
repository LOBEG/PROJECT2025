import jwt_decode from 'jwt-decode';

(async () => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state'); // <-- Make sure "state" is present!

  if (!code || !state) {
    console.error('Missing code or state in OAuth callback!');
    return;
  }

  const res = await fetch('/.netlify/functions/tokenExchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, state }), // <-- Send both code and state
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

  // Optional: redirect to dashboard or store token
  // window.location.href = '/dashboard.html';
})();