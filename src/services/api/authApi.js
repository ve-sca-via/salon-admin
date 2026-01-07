/**
 * Authentication API - Direct axios calls (not RTK Query)
 * 
 * Auth operations need to be outside RTK Query because:
 * 1. Login happens before Redux store is fully hydrated
 * 2. Token refresh needs to work without Redux dependency
 */

import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

/**
 * Login with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{user: Object, access_token: string, refresh_token: string}>}
 */
export const login = async (email, password) => {
  try {
    const response = await axios.post(`${BACKEND_URL}/api/v1/auth/login`, {
      email,
      password,
    });

    const { user, access_token, refresh_token } = response.data;

    // Store tokens
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user', JSON.stringify(user));

    return response.data;
  } catch (error) {
    const message = error.response?.data?.detail || error.message || 'Login failed';
    throw new Error(message);
  }
};

/**
 * Logout and clear tokens
 * @returns {Promise<void>}
 */
export const logout = async () => {
  try {
    const token = localStorage.getItem('access_token');
    
    if (token) {
      // Call backend logout endpoint
      await axios.post(
        `${BACKEND_URL}/api/v1/auth/logout`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    }
  } catch (error) {
    // Continue with local cleanup even if backend call fails
  } finally {
    // Always clear local storage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }
};

/**
 * Get current user profile
 * @returns {Promise<{user: Object}>}
 */
export const getCurrentUser = async () => {
  try {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      throw new Error('No access token found');
    }

    const response = await axios.get(`${BACKEND_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const user = response.data;
    
    // Update stored user
    localStorage.setItem('user', JSON.stringify(user));

    return { user };
  } catch (error) {
    const message = error.response?.data?.detail || error.message || 'Failed to get user';
    throw new Error(message);
  }
};

/**
 * Refresh access token
 * @returns {Promise<{access_token: string}>}
 */
export const refreshToken = async () => {
  try {
    const refresh_token = localStorage.getItem('refresh_token');
    
    if (!refresh_token) {
      throw new Error('No refresh token found');
    }

    const response = await axios.post(`${BACKEND_URL}/api/v1/auth/refresh`, {
      refresh_token,
    });

    const { access_token } = response.data;
    
    // Update stored token
    localStorage.setItem('access_token', access_token);

    return { access_token };
  } catch (error) {
    // Refresh failed - clear all tokens
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    
    const message = error.response?.data?.detail || error.message || 'Token refresh failed';
    throw new Error(message);
  }
};
