/**
 * Staff Management API - RTK Query
 * 
 * Handles staff CRUD operations for admin
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import axiosBaseQuery from './baseQuery';

export const staffApi = createApi({
  reducerPath: 'staffApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Staff', 'StaffMember'],
  endpoints: (builder) => ({
    // Get all staff
    getAllStaff: builder.query({
      query: ({ limit = 50, offset = 0, salonId } = {}) => ({
        url: '/api/v1/admin/staff',
        method: 'get',
        params: { limit, offset, salon_id: salonId },
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Staff', id })),
              { type: 'Staff', id: 'LIST' },
            ]
          : [{ type: 'Staff', id: 'LIST' }],
      keepUnusedDataFor: 60, // Cache for 1 minute
      refetchOnMountOrArgChange: true, // ALWAYS refetch
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }),

    // Get single staff member
    getStaffById: builder.query({
      query: (staffId) => ({
        url: `/api/v1/admin/staff/${staffId}`,
        method: 'get',
      }),
      providesTags: (result, error, id) => [{ type: 'StaffMember', id }],
      keepUnusedDataFor: 300,
    }),

    // Create staff member
    createStaff: builder.mutation({
      query: (staffData) => ({
        url: '/api/v1/admin/staff',
        method: 'post',
        data: staffData,
      }),
      invalidatesTags: [{ type: 'Staff', id: 'LIST' }],
    }),

    // Update staff member
    updateStaff: builder.mutation({
      query: ({ staffId, data }) => ({
        url: `/api/v1/admin/staff/${staffId}`,
        method: 'put',
        data,
      }),
      invalidatesTags: (result, error, { staffId }) => [
        { type: 'StaffMember', id: staffId },
        { type: 'Staff', id: 'LIST' },
      ],
    }),

    // Delete staff member
    deleteStaff: builder.mutation({
      query: (staffId) => ({
        url: `/api/v1/admin/staff/${staffId}`,
        method: 'delete',
      }),
      invalidatesTags: [{ type: 'Staff', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetAllStaffQuery,
  useGetStaffByIdQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
} = staffApi;
