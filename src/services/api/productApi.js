/**
 * Product Management API - RTK Query
 *
 * Handles product CRUD operations for admin panel.
 * Uses the same axiosBaseQuery pattern as salonApi, serviceCategoryApi, etc.
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import axiosBaseQuery from './baseQuery';

export const productApi = createApi({
  reducerPath: 'productApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Products', 'Product'],
  endpoints: (builder) => ({

    // ========================================
    // LIST (Admin — includes inactive)
    // ========================================
    getAllProducts: builder.query({
      query: ({ category, is_featured, search, limit = 50, offset = 0 } = {}) => ({
        url: '/api/v1/products/admin/all',
        method: 'get',
        params: {
          ...(category && { category }),
          ...(is_featured !== undefined && is_featured !== null && { is_featured }),
          ...(search && { search }),
          limit,
          offset,
        },
      }),
      providesTags: (result) =>
        result?.products
          ? [
              ...result.products.map(({ id }) => ({ type: 'Products', id })),
              { type: 'Products', id: 'LIST' },
            ]
          : [{ type: 'Products', id: 'LIST' }],
      keepUnusedDataFor: 300,
      refetchOnReconnect: true,
    }),

    // ========================================
    // GET SINGLE PRODUCT
    // ========================================
    getProductById: builder.query({
      query: (productId) => ({
        url: `/api/v1/products/${productId}`,
        method: 'get',
      }),
      providesTags: (result, error, id) => [{ type: 'Product', id }],
      keepUnusedDataFor: 300,
    }),

    // ========================================
    // GET CATEGORIES (for filter dropdown)
    // ========================================
    getProductCategories: builder.query({
      query: () => ({
        url: '/api/v1/products/categories',
        method: 'get',
      }),
      keepUnusedDataFor: 600,
    }),

    // ========================================
    // CREATE PRODUCT
    // ========================================
    createProduct: builder.mutation({
      query: (productData) => ({
        url: '/api/v1/products',
        method: 'post',
        data: productData,
      }),
      invalidatesTags: [{ type: 'Products', id: 'LIST' }],
    }),

    // ========================================
    // UPDATE PRODUCT
    // ========================================
    updateProduct: builder.mutation({
      query: ({ productId, data }) => ({
        url: `/api/v1/products/${productId}`,
        method: 'put',
        data,
      }),
      // Optimistic update for instant UI feedback
      async onQueryStarted({ productId, data }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          productApi.util.updateQueryData('getAllProducts', undefined, (draft) => {
            const product = draft?.products?.find((p) => p.id === productId);
            if (product) {
              Object.assign(product, data);
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: (result, error, { productId }) => [
        { type: 'Product', id: productId },
        { type: 'Products', id: 'LIST' },
      ],
    }),

    // ========================================
    // DELETE PRODUCT (soft-delete by default)
    // ========================================
    deleteProduct: builder.mutation({
      query: ({ productId, hard = false }) => ({
        url: `/api/v1/products/${productId}`,
        method: 'delete',
        params: { hard },
      }),
      invalidatesTags: [{ type: 'Products', id: 'LIST' }],
    }),

    // ========================================
    // UPLOAD PRODUCT IMAGE (via Supabase Storage)
    // ========================================
    uploadProductImage: builder.mutation({
      query: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: '/api/v1/upload/cloudinary-product-image',
          method: 'post',
          data: formData,
        };
      },
    }),
  }),
});

export const {
  useGetAllProductsQuery,
  useGetProductByIdQuery,
  useGetProductCategoriesQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useUploadProductImageMutation,
} = productApi;
