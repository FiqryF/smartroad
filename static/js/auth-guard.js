// auth-guard.js

// 1. Instantly check if the JWT token exists in localStorage
const jwtToken = localStorage.getItem('jwtToken');

if (!jwtToken) {
    // Redirect immediately to login.html if there's no token
    window.location.replace('login.html');
}

// 2. Globally available utility function for authenticated API calls
window.authFetch = async function(url, options = {}) {
    // Ensure options.headers exists
    if (!options.headers) {
        options.headers = {};
    }

    // Retrieve the token and inject it into the Authorization header
    const currentToken = localStorage.getItem('jwtToken');
    if (currentToken) {
        options.headers['Authorization'] = 'Bearer ' + currentToken;
    }

    try {
        // Execute the fetch request with the injected headers
        const response = await fetch(url, options);

        // 401 Unauthorized or 422 Unprocessable Entity (Flask-JWT-Extended uses 422 for malformed tokens)
        if (response.status === 401 || response.status === 422) {
            console.warn('Session expired or unauthorized. Redirecting to login.');
            
            // Clear the invalid/expired token and redirect
            localStorage.removeItem('jwtToken');
            window.location.replace('login.html');
            return null; // Return null to indicate failure
        }

        return response;
    } catch (error) {
        console.error('AuthFetch error:', error);
        throw error;
    }
};
