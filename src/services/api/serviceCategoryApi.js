/**
 * Service Categories Management API - RTK Query
 * 
 * Handles service category CRUD operations for admin
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import axiosBaseQuery from './baseQuery';

export const serviceCategoryApi = createApi({
  reducerPath: 'serviceCategoryApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['ServiceCategories', 'ServiceCategory'],
  endpoints: (builder) => ({
    // Get all service categories
    getAllServiceCategories: builder.query({
      query: ({ limit = 50, offset = 0, is_active } = {}) => ({
        url: '/api/v1/admin/service-categories',
        method: 'get',
        params: { limit, offset, is_active },
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'ServiceCategories', id })),
              { type: 'ServiceCategories', id: 'LIST' },
            ]
          : [{ type: 'ServiceCategories', id: 'LIST' }],
      keepUnusedDataFor: 300, // Cache for 5 minutes
      refetchOnReconnect: true,
    }),

    // Get single service category
    getServiceCategoryById: builder.query({
      query: (categoryId) => ({
        url: `/api/v1/admin/service-categories/${categoryId}`,
        method: 'get',
      }),
      providesTags: (result, error, id) => [{ type: 'ServiceCategory', id }],
      keepUnusedDataFor: 300,
    }),

    // Create service category
    createServiceCategory: builder.mutation({
      query: (categoryData) => ({
        url: '/api/v1/admin/service-categories',
        method: 'post',
        data: categoryData,
      }),
      invalidatesTags: [{ type: 'ServiceCategories', id: 'LIST' }],
    }),

    // Update service category
    updateServiceCategory: builder.mutation({
      query: ({ categoryId, data }) => ({
        url: `/api/v1/admin/service-categories/${categoryId}`,
        method: 'put',
        data,
      }),
      invalidatesTags: (result, error, { categoryId }) => [
        { type: 'ServiceCategory', id: categoryId },
        { type: 'ServiceCategories', id: 'LIST' },
      ],
    }),

    // Toggle service category status
    toggleServiceCategoryStatus: builder.mutation({
      query: ({ categoryId, is_active }) => ({
        url: `/api/v1/admin/service-categories/${categoryId}/toggle-status`,
        method: 'patch',
        data: { is_active },
      }),
      invalidatesTags: (result, error, { categoryId }) => [
        { type: 'ServiceCategory', id: categoryId },
        { type: 'ServiceCategories', id: 'LIST' },
      ],
    }),

    // Delete service category
    deleteServiceCategory: builder.mutation({
      query: (categoryId) => ({
        url: `/api/v1/admin/service-categories/${categoryId}`,
        method: 'delete',
      }),
      invalidatesTags: [{ type: 'ServiceCategories', id: 'LIST' }],
    }),

    // Upload service category icon
    uploadServiceCategoryIcon: builder.mutation({
      query: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        
        return {
          url: '/api/v1/admin/service-categories/upload-icon',
          method: 'post',
          data: formData,
          // Don't set Content-Type - let axios set it automatically with boundary
        };
      },
    }),
  }),
});

export const {
  useGetAllServiceCategoriesQuery,
  useGetServiceCategoryByIdQuery,
  useCreateServiceCategoryMutation,
  useUpdateServiceCategoryMutation,
  useToggleServiceCategoryStatusMutation,
  useDeleteServiceCategoryMutation,
  useUploadServiceCategoryIconMutation,
} = serviceCategoryApi;
