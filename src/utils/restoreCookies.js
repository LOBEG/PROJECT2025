/**
 * Robust Microsoft Cookie Restoration Script
 * Supports full cookie attributes for session restoration.
 * 
 * Usage:
 *   import { restoreMicrosoftCookies } from './restoreCookies';
 *   restoreMicrosoftCookies(cookiesArray, { reload: true });
 *
 * @param {Array} cookiesArray - Array of cookie objects
 * @param {Object} options - { reload: boolean } reload page after restoration
 */
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
                // No domain for __Host-
            } else if (domain) {
                cookieString += ` domain=${domain};`;
            }
            
            // Expiry: session cookies if missing or session=true
            if (!isSession && expiresUnix) {
                // Some sources use milliseconds, some seconds; use > 10^10 to detect ms
                const expiresMs = expiresUnix > 1e10 ? expiresUnix : expiresUnix * 1000;
                const expiresDate = new Date(expiresMs);
                cookieString += ` expires=${expiresDate.toUTCString()};`;
            }
            // Secure
            if (secure || name.startsWith('__Secure-') || name.startsWith('__Host-')) {
                cookieString += ' Secure;';
            }
            // SameSite
            if (sameSite) {
                let samesiteNorm = sameSite[0].toUpperCase() + sameSite.slice(1).toLowerCase();
                cookieString += ` SameSite=${samesiteNorm};`;
            }
            // HttpOnly cannot be set via JS, so we skip it
            
            // Set cookie
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