// App Configuration
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Salon Admin Panel';
export const ADMIN_EMAIL_DOMAIN = import.meta.env.VITE_ADMIN_EMAIL_DOMAIN || '@admin.com';

// User Roles - Based on Database Schema
export const ROLES = {
  ADMIN: 'admin',                          // Admin users (cannot create other admins)
  RELATIONSHIP_MANAGER: 'relationship_manager',  // Field agents/RM (can be created by admin)
  VENDOR: 'vendor',                        // Salon owners/vendors
  CUSTOMER: 'customer'                     // Regular customers (can be created by admin)
};

// Role Labels for Display
export const ROLE_LABELS = {
  admin: 'Admin',
  relationship_manager: 'Relationship Manager',
  vendor: 'Vendor',
  customer: 'Customer'
};

// Roles that admin can create (admin cannot create other admins)
export const CREATABLE_ROLES = [ROLES.RELATIONSHIP_MANAGER];

// Appointment Statuses
export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show'
};

// Payment Statuses
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  REFUNDED: 'refunded',
  FAILED: 'failed'
};

// Date Formats
export const DATE_FORMAT = 'MMM dd, yyyy';
export const TIME_FORMAT = 'hh:mm a';
export const DATETIME_FORMAT = 'MMM dd, yyyy hh:mm a';

// Pagination
export const ITEMS_PER_PAGE = 20;

// Chart Colors
export const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4'
};
