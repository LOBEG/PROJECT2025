const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const pkceStore = {}; // In-memory session store (for dev/demo only)

function generateCodeVerifier() {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let verifier = '';
  for (let i = 0; i < 64; i++) {
    verifier += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return verifier;
}

function generateCodeChallenge(verifier) {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return hash.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

exports.handler = async (event) => {
  const sessionId = uuidv4();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Store codeVerifier for this session
  pkceStore[sessionId] = codeVerifier;

  // Build Microsoft login URL (state param is required for PKCE!)
  const params = new URLSearchParams({
    client_id: 'eabd0e31-5707-4a85-aae6-79c53dc2c7f0',
    response_type: 'code',
    redirect_uri: 'https://vaultydocs.com/oauth-callback',
    response_mode: 'query',
    scope: 'openid profile email offline_access',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: sessionId // <-- CRITICAL: state param must be present!
  });
  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;

  return {
    statusCode: 200,
    body: JSON.stringify({ authUrl, sessionId }),
    headers: { 'Access-Control-Allow-Origin': '*' }
  };
};

exports.pkceStore = pkceStore;