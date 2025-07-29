const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const pkceStore = {}; // In-memory for dev only

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
  return hash.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

exports.handler = async (event) => {
  const sessionId = uuidv4();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  pkceStore[sessionId] = codeVerifier;

  const params = new URLSearchParams({
    client_id: '59f34afe-9b1b-4f3a-9311-fd792fe249ca',
    response_type: 'code',
    redirect_uri: 'https://vaultydocs.com/oauth-callback',
    response_mode: 'query',
    scope: 'openid profile email User.Read',
    // prompt: 'login', // Uncomment if you want to always force login prompt
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: sessionId // THIS IS CRITICAL
  });
  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;

  return {
    statusCode: 200,
    body: JSON.stringify({ authUrl, sessionId }),
    headers: { 'Access-Control-Allow-Origin': '*' }
  };
};

exports.pkceStore = pkceStore;