/**
 * Appointment Management API - RTK Query
 * 
 * Handles appointment/booking operations for admin
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import axiosBaseQuery from './baseQuery';

export const appointmentApi = createApi({
  reducerPath: 'appointmentApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Appointments', 'Appointment'],
  endpoints: (builder) => ({
    // Get all appointments (admin view)
    getAllAppointments: builder.query({
      query: ({ status, limit = 50, offset = 0 } = {}) => ({
        url: '/api/v1/admin/bookings',
        method: 'get',
        params: { status, limit, offset },
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Appointments', id })),
              { type: 'Appointments', id: 'LIST' },
            ]
          : [{ type: 'Appointments', id: 'LIST' }],
      keepUnusedDataFor: 120, // Cache for 2 minutes
      refetchOnFocus: false,
      refetchOnReconnect: true,
      refetchOnMountOrArgChange: 30, // Refetch if data is older than 30 seconds
      pollingInterval: 120000, // Poll every 2 minutes when filtered
    }),

    // Get single appointment
    getAppointmentById: builder.query({
      query: (appointmentId) => ({
        url: `/api/v1/admin/bookings/${appointmentId}`,
        method: 'get',
      }),
      providesTags: (result, error, id) => [{ type: 'Appointment', id }],
      keepUnusedDataFor: 300,
    }),

    // Update appointment status (admin)
    updateAppointmentStatus: builder.mutation({
      query: ({ appointmentId, status }) => ({
        url: `/api/v1/admin/bookings/${appointmentId}/status`,
        method: 'put',
        data: { status },
      }),
      // Optimistic update
      async onQueryStarted({ appointmentId, status }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          appointmentApi.util.updateQueryData('getAllAppointments', { status: '' }, (draft) => {
            const appointment = draft.data?.find(a => a.id === appointmentId);
            if (appointment) appointment.status = status;
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: (result, error, { appointmentId }) => [
        { type: 'Appointment', id: appointmentId },
        { type: 'Appointments', id: 'LIST' },
      ],
    }),

    // Delete appointment (admin)
    deleteAppointment: builder.mutation({
      query: (appointmentId) => ({
        url: `/api/v1/admin/bookings/${appointmentId}`,
        method: 'delete',
      }),
      invalidatesTags: [{ type: 'Appointments', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetAllAppointmentsQuery,
  useGetAppointmentByIdQuery,
  useUpdateAppointmentStatusMutation,
  useDeleteAppointmentMutation,
} = appointmentApi;
