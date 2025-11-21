/**
 * Salon Management API - RTK Query
 * 
 * Handles salon approval, rejection, and management operations for admin
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import axiosBaseQuery from './baseQuery';

export const salonApi = createApi({
  reducerPath: 'salonApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Salons', 'Salon', 'PendingSalons', 'RecentActivity'],
  endpoints: (builder) => ({
    // Get all salons (admin view)
    getAllSalons: builder.query({
      query: ({ status, limit = 50, offset = 0 } = {}) => ({
        url: '/api/v1/admin/salons',
        method: 'get',
        params: { status, limit, offset },
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Salons', id })),
              { type: 'Salons', id: 'LIST' },
            ]
          : [{ type: 'Salons', id: 'LIST' }],
      keepUnusedDataFor: 300, // Cache for 5 minutes
      refetchOnMountOrArgChange: 30, // Refetch if data is older than 30 seconds
    }),

    // Get pending salons (vendor join requests)
    getPendingSalons: builder.query({
      query: ({ limit = 50, offset = 0 } = {}) => ({
        url: '/api/v1/admin/vendor-requests',
        method: 'get',
        params: { status_filter: 'pending', limit, offset },
      }),
      providesTags: ['PendingSalons'],
      keepUnusedDataFor: 180, // Cache for 3 minutes (now persisted to localStorage)
      refetchOnFocus: false, // Using Supabase real-time instead
      refetchOnReconnect: true,
      refetchOnMountOrArgChange: 60, // Only refetch if data is older than 60 seconds
      pollingInterval: 60000, // Poll every 60 seconds for updates (reduced from 30s)
    }),

    // Get single salon details
    getSalonById: builder.query({
      query: (salonId) => ({
        url: `/api/v1/admin/salons/${salonId}`,
        method: 'get',
      }),
      providesTags: (result, error, id) => [{ type: 'Salon', id }],
      keepUnusedDataFor: 300,
    }),

    // Approve vendor request
    approveVendorRequest: builder.mutation({
      query: ({ requestId, adminNotes }) => ({
        url: `/api/v1/admin/vendor-requests/${requestId}/approve`,
        method: 'post',
        data: { admin_notes: adminNotes },
      }),
      invalidatesTags: ['PendingSalons', { type: 'Salons', id: 'LIST' }, 'DashboardStats', 'RecentActivity'],
    }),

    // Reject vendor request
    rejectVendorRequest: builder.mutation({
      query: ({ requestId, adminNotes }) => ({
        url: `/api/v1/admin/vendor-requests/${requestId}/reject`,
        method: 'post',
        data: { admin_notes: adminNotes },
      }),
      invalidatesTags: ['PendingSalons', 'DashboardStats', 'RecentActivity'],
    }),

    // Update salon (admin)
    updateSalon: builder.mutation({
      query: ({ salonId, data }) => ({
        url: `/api/v1/admin/salons/${salonId}`,
        method: 'put',
        data,
      }),
      invalidatesTags: (result, error, { salonId }) => [
        { type: 'Salon', id: salonId },
        { type: 'Salons', id: 'LIST' },
      ],
    }),

    // Delete salon (admin)
    deleteSalon: builder.mutation({
      query: (salonId) => ({
        url: `/api/v1/admin/salons/${salonId}`,
        method: 'delete',
      }),
      invalidatesTags: [{ type: 'Salons', id: 'LIST' }, 'DashboardStats'],
    }),

    // Toggle salon active status
    toggleSalonStatus: builder.mutation({
      query: ({ salonId, isActive }) => ({
        url: `/api/v1/admin/salons/${salonId}/status`,
        method: 'put',
        data: { is_active: isActive },
      }),
      // Optimistic update for instant UI feedback
      async onQueryStarted({ salonId, isActive }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          salonApi.util.updateQueryData('getAllSalons', {}, (draft) => {
            const salon = draft.data?.find(s => s.id === salonId);
            if (salon) salon.is_active = isActive;
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: (result, error, { salonId }) => [
        { type: 'Salon', id: salonId },
        { type: 'Salons', id: 'LIST' },
        'DashboardStats',
      ],
    }),
  }),
});

export const {
  useGetAllSalonsQuery,
  useGetPendingSalonsQuery,
  useGetSalonByIdQuery,
  useApproveVendorRequestMutation,
  useRejectVendorRequestMutation,
  useUpdateSalonMutation,
  useDeleteSalonMutation,
  useToggleSalonStatusMutation,
} = salonApi;
