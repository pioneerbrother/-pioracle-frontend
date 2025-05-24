// src/services/api.jsx

import axios from 'axios';


// --- Configuration ---
// Use environment variables for the base URL, provide a fallback for local dev
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
// In src/services/api.jsx (top of the file for testing)
console.log('VITE_API_BASE_URL from import.meta.env:', import.meta.env.VITE_API_BASE_URL);

console.log('Actual API_BASE_URL being used for Axios:', API_BASE_URL);

// --- Create Axios Instance ---
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for sending/receiving cookies if using sessions
  headers: {
    'Content-Type': 'application/json',
    // You can add other default headers here if needed
  },
});

// --- Interceptors (Optional but Recommended) ---

// Request Interceptor: Adds the auth token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      // Ensure headers object exists
      config.headers = config.headers || {};
      // Add the Authorization header
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('API Interceptor: Token added to request headers.');
    } else {
      console.log('API Interceptor: No token found.');
    }
    return config; // Must return the config object
  },
  (error) => {
    // Handle request error (e.g., network issue before sending)
    console.error('API Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor (Example: Handle common errors like 401 Unauthorized)
// You can expand this to handle different error statuses
api.interceptors.response.use(
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    // Return the response directly if successful
    return response;
  },
  (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    console.error('API Response Interceptor Error:', error.response || error);

    // Example: Handle 401 Unauthorized (e.g., token expired or invalid)
    if (error.response && error.response.status === 401) {
      console.warn('API Interceptor: Received 401 Unauthorized. Clearing token and potentially redirecting.');
      // Remove token from local storage
      localStorage.removeItem('authToken');

      // Optionally redirect to login page
      // Check if already on login page to prevent loop
      if (window.location.pathname !== '/login') {
         // You might want a more sophisticated way to trigger logout/redirect
         // that involves your AuthContext, but this is a basic approach.
         // window.location.href = '/login';
         // Or maybe just alert the user:
         // alert("Your session has expired. Please log in again.");
      }
    }

    // It's important to reject the promise so the calling code (.catch block) still runs
    return Promise.reject(error);
  }
);


// --- Export the Configured Instance ---
// We use export default because other files are trying to import it as `import api from ...`
export default api;