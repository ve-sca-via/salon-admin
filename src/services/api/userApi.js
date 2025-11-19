/**
 * User Management API - RTK Query
 * 
 * Handles user CRUD operations for admin (customers, vendors, RMs)
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import axiosBaseQuery from './baseQuery';

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Users', 'User', 'RMs'],
  endpoints: (builder) => ({
    // Get all users
    getAllUsers: builder.query({
      query: ({ role, limit = 50, page = 1 , is_active = true } = {}) => ({
        url: '/api/v1/admin/users/',
        method: 'get',
        params: { role, limit, page , is_active},
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Users', id })),
              { type: 'Users', id: 'LIST' },
            ]
          : [{ type: 'Users', id: 'LIST' }],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),

    // Get single user
    getUserById: builder.query({
      query: (userId) => ({
        url: `/api/v1/admin/users/${userId}`,
        method: 'get',
      }),
      providesTags: (result, error, id) => [{ type: 'User', id }],
      keepUnusedDataFor: 300,
    }),

    // Create user (admin)
    createUser: builder.mutation({
      query: (userData) => ({
        url: '/api/v1/admin/users/',
        method: 'post',
        data: userData,
      }),
      invalidatesTags: [{ type: 'Users', id: 'LIST' }, 'DashboardStats'],
    }),

    // Update user (admin)
    updateUser: builder.mutation({
      query: ({ userId, data }) => ({
        url: `/api/v1/admin/users/${userId}`,
        method: 'put',
        data,
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: 'User', id: userId },
        { type: 'Users', id: 'LIST' },
      ],
    }),

    // Delete user (admin)
    deleteUser: builder.mutation({
      query: (userId) => ({
        url: `/api/v1/admin/users/${userId}`,
        method: 'delete',
      }),
      invalidatesTags: [{ type: 'Users', id: 'LIST' }, 'DashboardStats'],
    }),

    // Get all RMs
    getAllRMs: builder.query({
      query: ({ limit = 50, offset = 0 } = {}) => ({
        url: '/api/v1/admin/rms',
        method: 'get',
        params: { limit, offset },
      }),
      providesTags: ['RMs'],
      keepUnusedDataFor: 300,
    }),

    // Update RM status
    updateRMStatus: builder.mutation({
      query: ({ rmId, isActive }) => ({
        url: `/api/v1/admin/rms/${rmId}/status`,
        method: 'put',
        data: { is_active: isActive },
      }),
      invalidatesTags: ['RMs', 'DashboardStats'],
    }),
  }),
});

export const {
  useGetAllUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetAllRMsQuery,
  useUpdateRMStatusMutation,
} = userApi;
