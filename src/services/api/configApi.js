/**
 * System Configuration API - RTK Query
 * 
 * Handles system configuration CRUD operations for admin
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import axiosBaseQuery from './baseQuery';

export const configApi = createApi({
  reducerPath: 'configApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['SystemConfigs', 'SystemConfig'],
  endpoints: (builder) => ({
    // Get all system configurations
    getSystemConfigs: builder.query({
      query: () => ({
        url: '/api/v1/admin/config',
        method: 'get',
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'SystemConfigs', id })),
              { type: 'SystemConfigs', id: 'LIST' },
            ]
          : [{ type: 'SystemConfigs', id: 'LIST' }],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),

    // Get single system configuration
    getSystemConfig: builder.query({
      query: (configKey) => ({
        url: `/api/v1/admin/config/${configKey}`,
        method: 'get',
      }),
      providesTags: (result, error, configKey) => [{ type: 'SystemConfig', id: configKey }],
      keepUnusedDataFor: 300,
    }),

    // Create system configuration
    createSystemConfig: builder.mutation({
      query: (configData) => ({
        url: '/api/v1/admin/config',
        method: 'post',
        data: configData,
      }),
      invalidatesTags: [{ type: 'SystemConfigs', id: 'LIST' }],
    }),

    // Update system configuration
    updateSystemConfig: builder.mutation({
      query: ({ configKey, data }) => ({
        url: `/api/v1/admin/config/${configKey}`,
        method: 'put',
        data,
      }),
      invalidatesTags: (result, error, { configKey }) => [
        { type: 'SystemConfig', id: configKey },
        { type: 'SystemConfigs', id: 'LIST' },
      ],
    }),

    // Delete system configuration
    deleteSystemConfig: builder.mutation({
      query: (configKey) => ({
        url: `/api/v1/admin/config/${configKey}`,
        method: 'delete',
      }),
      invalidatesTags: [{ type: 'SystemConfigs', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetSystemConfigsQuery,
  useGetSystemConfigQuery,
  useCreateSystemConfigMutation,
  useUpdateSystemConfigMutation,
  useDeleteSystemConfigMutation,
} = configApi;
