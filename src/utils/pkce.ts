/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth 2.0
 * Used to secure authorization code flow
 */

/**
 * Generate a cryptographically random string for PKCE code verifier
 */
function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const values = window.crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    result += charset[values[i] % charset.length];
  }
  return result;
}

/**
 * Generate SHA256 hash and base64url encode for PKCE code challenge
 */
async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generate PKCE challenge pair (verifier and challenge)
 */
export async function generatePKCEChallenge(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  const codeVerifier = generateRandomString(128); // RFC 7636 recommends 43-128 characters
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  return {
    codeVerifier,
    codeChallenge
  };
}

/**
 * Generate a random state parameter for OAuth
 */
export function generateState(): string {
  return generateRandomString(32);
}

/**
 * Generate a random nonce for OpenID Connect
 */
export function generateNonce(): string {
  return generateRandomString(32);
}