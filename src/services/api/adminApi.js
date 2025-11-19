/**
 * Admin Dashboard API - RTK Query
 * 
 * Handles admin dashboard statistics and analytics
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import axiosBaseQuery from './baseQuery';

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['DashboardStats'],
  endpoints: (builder) => ({
    // Get dashboard statistics
    getDashboardStats: builder.query({
      query: () => ({
        url: '/api/v1/admin/stats',
        method: 'get',
      }),
      providesTags: ['DashboardStats'],
      keepUnusedDataFor: 60, // Cache for 1 minute (stats change frequently)
      refetchOnFocus: true,
    }),
  }),
});

export const {
  useGetDashboardStatsQuery,
} = adminApi;
