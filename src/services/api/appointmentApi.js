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
      keepUnusedDataFor: 300, // Cache for 5 minutes
      refetchOnReconnect: true,
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
      // Optimistic update - improved to handle all query variations
      async onQueryStarted({ appointmentId, status }, { dispatch, queryFulfilled }) {
        // Update all possible cache entries
        const patches = [];
        
        // Update for unfiltered query
        patches.push(
          dispatch(
            appointmentApi.util.updateQueryData('getAllAppointments', {}, (draft) => {
              const appointment = draft.data?.find(a => a.id === appointmentId);
              if (appointment) appointment.status = status;
            })
          )
        );
        
        // Update for filtered queries (common status filters)
        ['pending', 'confirmed', 'completed', 'cancelled'].forEach(filterStatus => {
          patches.push(
            dispatch(
              appointmentApi.util.updateQueryData('getAllAppointments', { status: filterStatus }, (draft) => {
                const appointment = draft.data?.find(a => a.id === appointmentId);
                if (appointment) appointment.status = status;
              })
            )
          );
        });
        
        try {
          await queryFulfilled;
        } catch {
          patches.forEach(patch => patch.undo());
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
      // Optimistically remove from cache
      async onQueryStarted(appointmentId, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          appointmentApi.util.updateQueryData('getAllAppointments', {}, (draft) => {
            if (draft?.data) {
              draft.data = draft.data.filter(a => a.id !== appointmentId);
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
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
