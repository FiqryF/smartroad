async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('jwtToken');
    
    if (!token) {
        window.location.replace('login.html');
        return null;
    }
    
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };
    
    try {
        const response = await fetch(url, { ...options, headers });
        
        if (response.status === 401) {
            localStorage.removeItem('jwtToken');
            window.location.replace('login.html');
            return null;
        }
        
        return response;
    } catch (error) {
        console.error('Fetch with auth error:', error);
        throw error;
    }
}
