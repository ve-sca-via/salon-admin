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
  tagTypes: ['DashboardStats', 'RecentActivity'],
  endpoints: (builder) => ({
    // Get dashboard statistics
    getDashboardStats: builder.query({
      query: () => ({
        url: '/api/v1/admin/stats',
        method: 'get',
      }),
      providesTags: ['DashboardStats'],
      keepUnusedDataFor: 60, // Cache for 1 minute only
      refetchOnFocus: true, // Refetch when tab regains focus
      refetchOnReconnect: true, // Refetch when network reconnects
      refetchOnMountOrArgChange: true, // Always refetch on mount or arg change
    }),
    
    // Get recent activity logs
    getRecentActivity: builder.query({
      query: ({ limit = 10 } = {}) => ({
        url: '/api/v1/admin/recent-activity',
        method: 'get',
        params: { limit },
      }),
      providesTags: ['RecentActivity'],
      keepUnusedDataFor: 60, // Cache for 1 minute
      refetchOnMountOrArgChange: true, // Always refetch
      refetchOnFocus: true, // Refetch when tab regains focus
    }),
  }),
});

export const {
  useGetDashboardStatsQuery,
  useGetRecentActivityQuery,
} = adminApi;
