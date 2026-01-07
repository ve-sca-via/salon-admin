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
      keepUnusedDataFor: 180, // Cache for 3 minutes (optimized from 60s)
      refetchOnFocus: false, // Don't refetch on tab focus (optimized - was true)
      refetchOnReconnect: true, // Keep this - important for reliability
      refetchOnMountOrArgChange: 120, // Only refetch if data is 2+ min old (optimized - was true)
    }),
    
    // Get recent activity logs
    getRecentActivity: builder.query({
      query: ({ limit = 10 } = {}) => ({
        url: '/api/v1/admin/recent-activity',
        method: 'get',
        params: { limit },
      }),
      providesTags: ['RecentActivity'],
      keepUnusedDataFor: 180, // Cache for 3 minutes (optimized from 60s)
      refetchOnMountOrArgChange: 120, // Only refetch if 2+ min old (optimized - was true)
      refetchOnFocus: false, // Don't refetch on tab focus (optimized - was true)
    }),
  }),
});

export const {
  useGetDashboardStatsQuery,
  useGetRecentActivityQuery,
} = adminApi;
