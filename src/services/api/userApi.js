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
  tagTypes: ['Users', 'User', 'RMs', 'RecentActivity'],
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
      keepUnusedDataFor: 60, // Cache for 1 minute only (was 10 min)
      refetchOnMountOrArgChange: true, // ALWAYS refetch when needed
      refetchOnFocus: true, // Refetch when tab regains focus
      refetchOnReconnect: true, // Refetch on reconnection
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
      // Optimistically add user to cache
      async onQueryStarted(userData, { dispatch, queryFulfilled }) {
        try {
          const { data: newUser } = await queryFulfilled;
          dispatch(
            userApi.util.updateQueryData('getAllUsers', {}, (draft) => {
              if (draft?.data) {
                draft.data.unshift(newUser);
              }
            })
          );
        } catch {}
      },
      invalidatesTags: [{ type: 'Users', id: 'LIST' }, 'DashboardStats', 'RecentActivity'],
    }),

    // Update user (admin)
    updateUser: builder.mutation({
      query: ({ userId, data }) => ({
        url: `/api/v1/admin/users/${userId}`,
        method: 'put',
        data,
      }),
      // Optimistic update for instant UI feedback
      async onQueryStarted({ userId, data }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          userApi.util.updateQueryData('getAllUsers', {}, (draft) => {
            const user = draft.data?.find(u => u.id === userId);
            if (user) {
              Object.assign(user, data);
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
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
      // Optimistically remove user from cache
      async onQueryStarted(userId, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          userApi.util.updateQueryData('getAllUsers', {}, (draft) => {
            if (draft?.data) {
              draft.data = draft.data.filter(u => u.id !== userId);
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
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
