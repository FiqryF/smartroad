// auth-guard.js

// 1. Instantly check if the JWT token exists in this tab's session
const jwtToken = sessionStorage.getItem('jwtToken');
const isAdminPage = window.location.pathname.includes('dashboard-admin');
const isPetugasPage = window.location.pathname.includes('petugas');

if (!jwtToken) {
    // Redirect immediately to login.html if there's no token
    window.location.replace('login.html');
}

if (isAdminPage && sessionStorage.getItem('userRole') !== 'admin') {
    if (window.clearAuthSession) window.clearAuthSession();
    else {
        sessionStorage.removeItem('jwtToken');
        sessionStorage.removeItem('userRole');
    }
    window.location.replace('login.html');
}

if (isPetugasPage && sessionStorage.getItem('userRole') !== 'petugas') {
    if (window.clearAuthSession) window.clearAuthSession();
    else {
        sessionStorage.removeItem('jwtToken');
        sessionStorage.removeItem('userRole');
    }
    window.location.replace('login.html');
}

// 2. Globally available utility function for authenticated API calls
window.authFetch = async function(url, options = {}) {
    // Ensure options.headers exists
    if (!options.headers) {
        options.headers = {};
    }

    // Retrieve the token and inject it into the Authorization header
    const currentToken = sessionStorage.getItem('jwtToken');
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
            if (window.clearAuthSession) window.clearAuthSession();
            else {
                sessionStorage.removeItem('jwtToken');
                sessionStorage.removeItem('userRole');
            }
            window.location.replace('login.html');
            return null; // Return null to indicate failure
        }

        return response;
    } catch (error) {
        console.error('AuthFetch error:', error);
        throw error;
    }
};
