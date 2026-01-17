import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '', 
});

// 1. Request Interceptor (Keeps your token attached)
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// 2. Response Interceptor (FIXED)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // If the server says "401 Unauthorized"
        if (error.response && error.response.status === 401) {
            
            // CHECK: Do we actually have a token?
            const token = localStorage.getItem('token');

            // If we HAD a token, but got a 401, it means the token expired. 
            // Clear it and redirect.
            if (token) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }

            // If we DIDN'T have a token (Guest), ignore this interceptor.
            // Pass the error back to Dashboard.jsx so it can render the "Restricted/Locked" view.
        }
        return Promise.reject(error);
    }
);

export default api;
