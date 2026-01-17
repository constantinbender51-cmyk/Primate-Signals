import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '', 
});

// 1. Request Interceptor (Existing)
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// 2. Response Interceptor (NEW)
api.interceptors.response.use(
    (response) => response, // Return successful responses as is
    (error) => {
        // If the server says "401 Unauthorized" (Token expired or invalid)
        if (error.response && error.response.status === 401) {
            // Clear the stale data
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Force redirect to login to get a fresh token
            // (We use window.location because navigate isn't available in this plain JS file)
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
