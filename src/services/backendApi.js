/**
 * Backend API Service
 * Integration with FastAPI backend at localhost:8000
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

/**
 * Get authorization header with JWT token
 */
const getAuthHeader = () => {
  const token = localStorage.getItem('access_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

/**
 * Handle API errors
 */
const handleApiError = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Network error' }));
    
    // Handle revoked token
    if (response.status === 401 && error.detail === 'Token has been revoked') {
      // Token was revoked (logged out elsewhere)
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }
    
    throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response;
};

// =====================================================
// AUTH ENDPOINTS
// =====================================================

/**
 * Login with email and password
 */
export const login = async (email, password) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    await handleApiError(response);
    const data = await response.json();

    // Store tokens
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('user', JSON.stringify(data.user));

    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

/**
 * Logout
 */
export const logout = async () => {
  try {
    await fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear local storage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }
};

/**
 * Get current user profile
 */
export const getCurrentUser = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    await handleApiError(response);
    return await response.json();
  } catch (error) {
    console.error('Get current user error:', error);
    throw error;
  }
};

// =====================================================
// ADMIN ENDPOINTS
// =====================================================

/**
 * Get all pending vendor requests
 */
export const getPendingVendorRequests = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/vendor-requests?status_filter=pending`, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch vendor requests');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching vendor requests:', error);
    throw error;
  }
};

/**
 * Approve vendor request
 */
export const approveVendorRequest = async (requestId, approvalData) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/vendor-requests/${requestId}/approve`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(approvalData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to approve vendor request');
    }

    return await response.json();
  } catch (error) {
    console.error('Error approving vendor request:', error);
    throw error;
  }
};

/**
 * Reject vendor request
 */
export const rejectVendorRequest = async (requestId, adminNotes) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/vendor-requests/${requestId}/reject`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ admin_notes: adminNotes }),
    });

    await handleApiError(response);
    return await response.json();
  } catch (error) {
    console.error('Error rejecting vendor request:', error);
    throw error;
  }
};

/**
 * Get all system configurations
 */
export const getSystemConfigs = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/config`, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    await handleApiError(response);
    return await response.json();
  } catch (error) {
    console.error('Error fetching system configs:', error);
    throw error;
  }
};

/**
 * Update system configuration
 */
export const updateSystemConfig = async (configKey, updateData) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/config/${configKey}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    await handleApiError(response);
    return await response.json();
  } catch (error) {
    console.error('Error updating system config:', error);
    throw error;
  }
};

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/dashboard/stats`, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    await handleApiError(response);
    return await response.json();
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
};

// =====================================================
// RM MANAGEMENT
// =====================================================

/**
 * Get all RMs
 */
export const getAllRMs = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams(params);
    const response = await fetch(`${BACKEND_URL}/api/admin/rms?${queryParams}`, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    await handleApiError(response);
    return await response.json();
  } catch (error) {
    console.error('Error fetching RMs:', error);
    throw error;
  }
};

/**
 * Get RM profile
 */
export const getRMProfile = async (rmId) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/rms/${rmId}`, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    await handleApiError(response);
    return await response.json();
  } catch (error) {
    console.error('Error fetching RM profile:', error);
    throw error;
  }
};

/**
 * Get RM score history
 */
export const getRMScoreHistory = async (rmId, params = {}) => {
  try {
    const queryParams = new URLSearchParams(params);
    const response = await fetch(`${BACKEND_URL}/api/admin/rms/${rmId}/score-history?${queryParams}`, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    await handleApiError(response);
    return await response.json();
  } catch (error) {
    console.error('Error fetching RM score history:', error);
    throw error;
  }
};

// =====================================================
// LOCATION ENDPOINTS (Existing)
// =====================================================

/**
 * Geocode an address to get latitude and longitude
 * @param {string} address - Full address to geocode
 * @returns {Promise<{latitude: number, longitude: number, formatted_address: string}>}
 */
export const geocodeAddress = async (address) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/location/geocode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Geocoding failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
};

/**
 * Reverse geocode coordinates to get address
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<{address: string}>}
 */
export const reverseGeocode = async (latitude, longitude) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/location/reverse-geocode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ latitude, longitude }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Reverse geocoding failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    throw error;
  }
};

/**
 * Find salons near a location
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} radiusKm - Search radius in kilometers
 * @returns {Promise<Array>}
 */
export const findNearbySalons = async (latitude, longitude, radiusKm = 10) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/location/salons/nearby`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude,
        longitude,
        radius_km: radiusKm,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to find nearby salons');
    }

    return await response.json();
  } catch (error) {
    console.error('Nearby salons error:', error);
    throw error;
  }
};

/**
 * Check if backend is available
 * @returns {Promise<boolean>}
 */
export const checkBackendHealth = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
};

/**
 * Batch geocode multiple addresses
 * @param {Array<{id: number, address: string}>} addresses
 * @param {Function} onProgress - Callback for progress updates
 * @returns {Promise<Array>}
 */
export const batchGeocodeAddresses = async (addresses, onProgress) => {
  const results = [];
  let completed = 0;

  for (const item of addresses) {
    try {
      const result = await geocodeAddress(item.address);
      results.push({
        id: item.id,
        success: true,
        ...result,
      });
    } catch (error) {
      results.push({
        id: item.id,
        success: false,
        error: error.message,
      });
    }

    completed++;
    if (onProgress) {
      onProgress(completed, addresses.length);
    }

    // Rate limiting: wait 1 second between requests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return results;
};

// =====================================================
// USER MANAGEMENT
// =====================================================

/**
 * Get all users with pagination and filters
 */
export const getUsers = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams(params);
    const response = await fetch(`${BACKEND_URL}/api/admin/users?${queryParams}`, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    await handleApiError(response);
    return await response.json();
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

/**
 * Create new user (HMR or Customer only)
 */
export const createUser = async (userData) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/users`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    await handleApiError(response);
    return await response.json();
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

/**
 * Update user
 */
export const updateUser = async (userId, updates) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    await handleApiError(response);
    return await response.json();
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

/**
 * Delete user
 */
export const deleteUser = async (userId) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    await handleApiError(response);
    return await response.json();
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

// =====================================================
// SALON MANAGEMENT
// =====================================================

/**
 * Get all salons (admin)
 */
export const getSalons = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/salons`, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    await handleApiError(response);
    return await response.json();
  } catch (error) {
    console.error('Error fetching salons:', error);
    throw error;
  }
};

/**
 * Update salon
 */
export const updateSalon = async (salonId, updates) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/salons/${salonId}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    await handleApiError(response);
    return await response.json();
  } catch (error) {
    console.error('Error updating salon:', error);
    throw error;
  }
};

/**
 * Delete salon
 */
export const deleteSalon = async (salonId) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/salons/${salonId}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    await handleApiError(response);
    return await response.json();
  } catch (error) {
    console.error('Error deleting salon:', error);
    throw error;
  }
};

// =====================================================
// BOOKINGS/APPOINTMENTS MANAGEMENT
// =====================================================

/**
 * Get all bookings (admin) with filters
 */
export const getBookings = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams(params);
    const response = await fetch(`${BACKEND_URL}/api/admin/bookings?${queryParams}`, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    await handleApiError(response);
    return await response.json();
  } catch (error) {
    console.error('Error fetching bookings:', error);
    throw error;
  }
};

/**
 * Update booking status
 */
export const updateBookingStatus = async (bookingId, status) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/bookings/${bookingId}/status`, {
      method: 'PUT',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    await handleApiError(response);
    return await response.json();
  } catch (error) {
    console.error('Error updating booking status:', error);
    throw error;
  }
};

// =====================================================
// SERVICES MANAGEMENT
// =====================================================

/**
 * Get all services
 */
export const getServices = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/services`, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    await handleApiError(response);
    return await response.json();
  } catch (error) {
    console.error('Error fetching services:', error);
    throw error;
  }
};

/**
 * Create service
 */
export const createService = async (serviceData) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/services`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(serviceData),
    });

    await handleApiError(response);
    return await response.json();
  } catch (error) {
    console.error('Error creating service:', error);
    throw error;
  }
};

/**
 * Update service
 */
export const updateService = async (serviceId, updates) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/services/${serviceId}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    await handleApiError(response);
    return await response.json();
  } catch (error) {
    console.error('Error updating service:', error);
    throw error;
  }
};

/**
 * Delete service
 */
export const deleteService = async (serviceId) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/services/${serviceId}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    await handleApiError(response);
    return await response.json();
  } catch (error) {
    console.error('Error deleting service:', error);
    throw error;
  }
};

// =====================================================
// STAFF MANAGEMENT
// =====================================================

/**
 * Get all staff
 */
export const getStaff = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/staff`, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    await handleApiError(response);
    return await response.json();
  } catch (error) {
    console.error('Error fetching staff:', error);
    throw error;
  }
};

/**
 * Update staff
 */
export const updateStaff = async (staffId, updates) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/staff/${staffId}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    await handleApiError(response);
    return await response.json();
  } catch (error) {
    console.error('Error updating staff:', error);
    throw error;
  }
};

/**
 * Delete staff
 */
export const deleteStaff = async (staffId) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/staff/${staffId}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    await handleApiError(response);
    return await response.json();
  } catch (error) {
    console.error('Error deleting staff:', error);
    throw error;
  }
};

export default {
  geocodeAddress,
  reverseGeocode,
  findNearbySalons,
  checkBackendHealth,
  batchGeocodeAddresses,
};

