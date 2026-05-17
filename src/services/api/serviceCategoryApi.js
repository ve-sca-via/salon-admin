/**
 * Service Categories & Subcategories Management API - RTK Query
 * 
 * Handles service category and subcategory CRUD operations for admin
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import axiosBaseQuery from './baseQuery';

export const serviceCategoryApi = createApi({
  reducerPath: 'serviceCategoryApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['ServiceCategories', 'ServiceCategory', 'Subcategories'],
  endpoints: (builder) => ({
    // =====================================================
    // PARENT CATEGORIES (Category 1)
    // =====================================================

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

    // =====================================================
    // SUBCATEGORIES (Category 2)
    // =====================================================

    // Get subcategories for a parent category
    getSubcategoriesByCategory: builder.query({
      query: ({ categoryId, is_active } = {}) => ({
        url: `/api/v1/admin/service-categories/${categoryId}/subcategories`,
        method: 'get',
        params: is_active !== undefined ? { is_active } : {},
      }),
      providesTags: (result, error, { categoryId }) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Subcategories', id })),
              { type: 'Subcategories', id: `PARENT_${categoryId}` },
            ]
          : [{ type: 'Subcategories', id: `PARENT_${categoryId}` }],
      keepUnusedDataFor: 300,
    }),

    // Create subcategory under a parent category
    createSubcategory: builder.mutation({
      query: ({ categoryId, data }) => ({
        url: `/api/v1/admin/service-categories/${categoryId}/subcategories`,
        method: 'post',
        data,
      }),
      invalidatesTags: (result, error, { categoryId }) => [
        { type: 'Subcategories', id: `PARENT_${categoryId}` },
        { type: 'ServiceCategories', id: 'LIST' },
      ],
    }),

    // Update subcategory
    updateSubcategory: builder.mutation({
      query: ({ subcategoryId, data }) => ({
        url: `/api/v1/admin/service-categories/subcategories/${subcategoryId}`,
        method: 'put',
        data,
      }),
      invalidatesTags: (result) => [
        { type: 'Subcategories', id: result?.data?.id },
        { type: 'Subcategories', id: `PARENT_${result?.data?.parent_category_id}` },
        { type: 'ServiceCategories', id: 'LIST' },
      ],
    }),

    // Toggle subcategory active status
    toggleSubcategoryStatus: builder.mutation({
      query: ({ subcategoryId, is_active }) => ({
        url: `/api/v1/admin/service-categories/subcategories/${subcategoryId}/toggle-status`,
        method: 'patch',
        data: { is_active },
      }),
      invalidatesTags: (result) => [
        { type: 'Subcategories', id: result?.data?.id },
        { type: 'Subcategories', id: `PARENT_${result?.data?.parent_category_id}` },
      ],
    }),

    // Delete subcategory
    deleteSubcategory: builder.mutation({
      query: (subcategoryId) => ({
        url: `/api/v1/admin/service-categories/subcategories/${subcategoryId}`,
        method: 'delete',
      }),
      invalidatesTags: [
        { type: 'Subcategories', id: 'LIST' },
        { type: 'ServiceCategories', id: 'LIST' },
      ],
    }),

    // Get all subcategories (admin overview)
    getAllSubcategories: builder.query({
      query: () => ({
        url: '/api/v1/admin/service-categories/all-subcategories',
        method: 'get',
      }),
      providesTags: [{ type: 'Subcategories', id: 'LIST' }],
      keepUnusedDataFor: 300,
    }),
  }),
});

export const {
  // Category hooks
  useGetAllServiceCategoriesQuery,
  useGetServiceCategoryByIdQuery,
  useCreateServiceCategoryMutation,
  useUpdateServiceCategoryMutation,
  useToggleServiceCategoryStatusMutation,
  useDeleteServiceCategoryMutation,
  useUploadServiceCategoryIconMutation,
  // Subcategory hooks
  useGetSubcategoriesByCategoryQuery,
  useCreateSubcategoryMutation,
  useUpdateSubcategoryMutation,
  useToggleSubcategoryStatusMutation,
  useDeleteSubcategoryMutation,
  useGetAllSubcategoriesQuery,
} = serviceCategoryApi;

