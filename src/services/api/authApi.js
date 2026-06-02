/**
 * Authentication API - Direct axios calls (not RTK Query)
 * 
 * Auth operations need to be outside RTK Query because:
 * 1. Login happens before Redux store is fully hydrated
 * 2. Token refresh needs to work without Redux dependency
 */

import axios from 'axios';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import {
  clearAuthStorage,
  syncTokenExpiryFromJwt,
  touchActivity,
  isInactivityExpired,
  isJwtExpired,
} from '../../utils/session';

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
    syncTokenExpiryFromJwt(access_token, refresh_token);
    touchActivity();

    return response.data;
  } catch (error) {
    let message = getApiErrorMessage(
      { status: error.response?.status, data: error.response?.data },
      'Login failed. Please try again.'
    );

    if (message === 'Login failed. Please try again.') {
      if (error.response?.status === 401) {
        message = 'Invalid email or password. Please check your credentials.';
      } else if (error.response?.status === 403) {
        message = 'Access denied. Please contact support.';
      } else if (!error.response) {
        message = 'Unable to connect to server. Please check your internet connection.';
      }
    }

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
    clearAuthStorage();
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

    const data = response.data;
    const user = data?.user ?? data;

    localStorage.setItem('user', JSON.stringify(user));

    return { user };
  } catch (error) {
    const message = getApiErrorMessage(
      { status: error.response?.status, data: error.response?.data },
      'Failed to get user'
    );
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

    const { access_token, refresh_token: newRefreshToken } = response.data;
    const storedRefresh = newRefreshToken || refresh_token;

    localStorage.setItem('access_token', access_token);
    if (newRefreshToken) {
      localStorage.setItem('refresh_token', newRefreshToken);
    }
    syncTokenExpiryFromJwt(access_token, storedRefresh);
    touchActivity();

    return { access_token, refresh_token: storedRefresh };
  } catch (error) {
    clearAuthStorage();
    
    const message = getApiErrorMessage(
      { status: error.response?.status, data: error.response?.data },
      'Token refresh failed'
    );
    throw new Error(message);
  }
};

/**
 * Validate stored session on app load / tab focus.
 * Enforces inactivity timeout, JWT expiry, and server-side /me check.
 * @returns {Promise<{ valid: boolean, user?: object, reason?: string }>}
 */
export const validateSession = async () => {
  const accessToken = localStorage.getItem('access_token');
  const refreshTokenValue = localStorage.getItem('refresh_token');

  if (!accessToken && !refreshTokenValue) {
    return { valid: false };
  }

  if (isInactivityExpired()) {
    clearAuthStorage();
    return { valid: false, reason: 'inactivity' };
  }

  if (refreshTokenValue && isJwtExpired(refreshTokenValue, 0)) {
    clearAuthStorage();
    return { valid: false, reason: 'refresh_expired' };
  }

  if (!accessToken || isJwtExpired(accessToken)) {
    if (!refreshTokenValue) {
      clearAuthStorage();
      return { valid: false, reason: 'no_refresh_token' };
    }
    try {
      await refreshToken();
    } catch {
      return { valid: false, reason: 'refresh_failed' };
    }
  }

  try {
    const { user } = await getCurrentUser();
    const role = user?.role ?? user?.user_role;
    if (role !== 'admin') {
      clearAuthStorage();
      return { valid: false, reason: 'not_admin' };
    }
    touchActivity();
    return { valid: true, user: { ...user, role } };
  } catch {
    clearAuthStorage();
    return { valid: false, reason: 'profile_invalid' };
  }
};
