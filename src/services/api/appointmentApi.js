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
      query: ({ status, limit = 20, page = 1, date_from, date_to } = {}) => ({
        url: '/api/v1/admin/bookings',
        method: 'get',
        params: {
          status,
          limit,
          page,
          ...(date_from && { date_from }),
          ...(date_to && { date_to }),
        },
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
  }),
});

export const {
  useGetAllAppointmentsQuery,
} = appointmentApi;
