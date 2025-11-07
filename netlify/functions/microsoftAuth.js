exports.handler = async (event) => {
    try {
        console.log('🔐 microsoftAuth function called');

        // Parse body
        const { email, password } = JSON.parse(event.body);

        console.log('📧 Email:', email);

        // ✅ Call Microsoft token endpoint from server (no CORS issues)
        const tokenEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'client_id': '2e338732-c914-4129-a148-45c24f2da81d',
                'scope': 'https://graph.microsoft.com/.default',
                'username': email,
                'password': password,
                'grant_type': 'password'
            }).toString()
        });

        const data = await response.json();

        console.log('📨 Microsoft response status:', response.status);

        if (response.ok && data.access_token) {
            console.log('✅ Authentication successful');
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    access_token: data.access_token,
                    refresh_token: data.refresh_token,
                    expires_in: data.expires_in,
                    token_type: data.token_type
                })
            };
        } else {
            console.log('❌ Authentication failed:', data);
            return {
                statusCode: response.status,
                body: JSON.stringify({
                    success: false,
                    error: data.error,
                    error_description: data.error_description
                })
            };
        }

    } catch (error) {
        console.error('❌ Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: 'Server error',
                message: error.message
            })
        };
    }
};
