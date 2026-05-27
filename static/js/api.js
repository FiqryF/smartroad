// static/js/api.js
const BASE_URL = "http://127.0.0.1:5000/api";

const ApiService = {
    async post(endpoint, bodyData) {
        try {
            const response = await fetch(`${BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bodyData)
            });

            const data = await response.json();
            return { ok: response.ok, status: response.status, data };
        } catch (error) {
            console.error(`API Error on ${endpoint}:`, error);
            throw error;
        }
    }
};
