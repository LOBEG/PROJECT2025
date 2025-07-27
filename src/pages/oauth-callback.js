export async function startMicrosoftLogin() {
  const res = await fetch('/.netlify/functions/oauthStart');
  const data = await res.json();
  window.location.href = data.authUrl;
}