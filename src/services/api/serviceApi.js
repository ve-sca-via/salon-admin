/**
 * Service Management API - RTK Query
 * 
 * Handles service CRUD operations for admin
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import axiosBaseQuery from './baseQuery';

export const serviceApi = createApi({
  reducerPath: 'serviceApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Services', 'Service'],
  endpoints: (builder) => ({
    // Get all services
    getAllServices: builder.query({
      query: ({ limit = 50, offset = 0 } = {}) => ({
        url: '/api/v1/admin/services',
        method: 'get',
        params: { limit, offset },
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Services', id })),
              { type: 'Services', id: 'LIST' },
            ]
          : [{ type: 'Services', id: 'LIST' }],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),

    // Get single service
    getServiceById: builder.query({
      query: (serviceId) => ({
        url: `/api/v1/admin/services/${serviceId}`,
        method: 'get',
      }),
      providesTags: (result, error, id) => [{ type: 'Service', id }],
      keepUnusedDataFor: 300,
    }),

    // Create service
    createService: builder.mutation({
      query: (serviceData) => ({
        url: '/api/v1/admin/services',
        method: 'post',
        data: serviceData,
      }),
      invalidatesTags: [{ type: 'Services', id: 'LIST' }],
    }),

    // Update service
    updateService: builder.mutation({
      query: ({ serviceId, data }) => ({
        url: `/api/v1/admin/services/${serviceId}`,
        method: 'put',
        data,
      }),
      invalidatesTags: (result, error, { serviceId }) => [
        { type: 'Service', id: serviceId },
        { type: 'Services', id: 'LIST' },
      ],
    }),

    // Delete service
    deleteService: builder.mutation({
      query: (serviceId) => ({
        url: `/api/v1/admin/services/${serviceId}`,
        method: 'delete',
      }),
      invalidatesTags: [{ type: 'Services', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetAllServicesQuery,
  useGetServiceByIdQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
} = serviceApi;
