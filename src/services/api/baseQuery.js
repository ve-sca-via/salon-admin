/**
 * Axios Base Query for RTK Query
 * Handles authentication, token refresh, and error handling
 */

import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const axiosInstance = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000, // 30 seconds
});

// =====================================================
// TOKEN REFRESH STATE
// =====================================================

let isRefreshing = false;
let failedQueue = [];

/**
 * Process all queued requests after token refresh
 */
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

/**
 * Refresh the access token using fetch to avoid interceptor recursion
 */
const refreshAccessToken = async () => {
  const refresh_token = localStorage.getItem('refresh_token');
  
  if (!refresh_token) {
    throw new Error('No refresh token available');
  }

  try {
    // Use fetch for refresh to avoid interceptor recursion
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    const newToken = data.access_token;
    
    // Store new token
    localStorage.setItem('access_token', newToken);
    
    // Update default header
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    
    return newToken;
  } catch (error) {
    // Refresh failed - clear storage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    throw error;
  }
};

// =====================================================
// REQUEST INTERCEPTOR (Add token to requests)
// =====================================================

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// =====================================================
// RESPONSE INTERCEPTOR (Handle 401 & token refresh)
// =====================================================

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is not 401 or request already retried, reject
    if (!error.response || error.response.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Check if token was revoked (logged out elsewhere)
    const errorMessage = error.response?.data?.detail || '';
    if (errorMessage === 'Token has been revoked') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(new Error('Session expired. Please login again.'));
    }

    // ==========================================
    // CASE 1: Refresh already in progress
    // ==========================================
    if (isRefreshing) {
      // Queue this request and wait for refresh to complete
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(token => {
          // Refresh succeeded - retry with new token
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return axiosInstance(originalRequest);
        })
        .catch(err => {
          // Refresh failed - propagate error
          return Promise.reject(err);
        });
    }

    // ==========================================
    // CASE 2: Start new token refresh
    // ==========================================
    originalRequest._retry = true;
    isRefreshing = true;

    return new Promise((resolve, reject) => {
      refreshAccessToken()
        .then(newToken => {
          // Success! Update token in original request
          originalRequest.headers['Authorization'] = 'Bearer ' + newToken;
          
          // Process all queued requests
          processQueue(null, newToken);
          
          // Retry original request
          resolve(axiosInstance(originalRequest));
        })
        .catch(err => {
          // Refresh failed - reject all queued requests
          processQueue(err, null);
          
          // Logout user
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          
          // Dispatch logout event for React app to handle
          window.dispatchEvent(new CustomEvent('auth:logout', { detail: 'Session expired' }));
          
          reject(err);
        })
        .finally(() => {
          isRefreshing = false;
        });
    });
  }
);

/**
 * Base query function for RTK Query
 */
const axiosBaseQuery =
  () =>
  async ({ url, method = 'GET', data, params, headers }) => {
    try {
      const config = {
        url,
        method,
        data,
        params,
      };
      
      // If data is FormData, remove Content-Type to let axios set it automatically
      if (data instanceof FormData) {
        config.headers = {
          ...headers,
          'Content-Type': undefined, // Let axios set the boundary
        };
      } else if (headers) {
        config.headers = headers;
      }
      
      const result = await axiosInstance(config);
      return { data: result.data };
    } catch (axiosError) {
      const err = axiosError;
      return {
        error: {
          status: err.response?.status,
          data: err.response?.data || err.message,
        },
      };
    }
  };

export default axiosBaseQuery;
