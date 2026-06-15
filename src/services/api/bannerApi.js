/**
 * Banner Management API - RTK Query
 *
 * Handles home-carousel banner CRUD + ordering for the admin panel.
 * Uses the same axiosBaseQuery pattern as productApi, salonApi, etc.
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import axiosBaseQuery from './baseQuery';

export const bannerApi = createApi({
  reducerPath: 'bannerApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Banners', 'Banner'],
  endpoints: (builder) => ({

    // ========================================
    // LIST (Admin — includes inactive)
    // ========================================
    getAllBanners: builder.query({
      query: () => ({
        url: '/api/v1/banners/admin/all',
        method: 'get',
      }),
      providesTags: (result) =>
        result?.banners
          ? [
              ...result.banners.map(({ id }) => ({ type: 'Banners', id })),
              { type: 'Banners', id: 'LIST' },
            ]
          : [{ type: 'Banners', id: 'LIST' }],
      keepUnusedDataFor: 60,
      refetchOnReconnect: true,
    }),

    // ========================================
    // CREATE BANNER
    // ========================================
    createBanner: builder.mutation({
      query: (bannerData) => ({
        url: '/api/v1/banners',
        method: 'post',
        data: bannerData,
      }),
      invalidatesTags: [{ type: 'Banners', id: 'LIST' }],
    }),

    // ========================================
    // UPDATE BANNER
    // ========================================
    updateBanner: builder.mutation({
      query: ({ bannerId, data }) => ({
        url: `/api/v1/banners/${bannerId}`,
        method: 'put',
        data,
      }),
      invalidatesTags: (result, error, { bannerId }) => [
        { type: 'Banner', id: bannerId },
        { type: 'Banners', id: 'LIST' },
      ],
    }),

    // ========================================
    // REORDER BANNERS (bulk sort_order update)
    // ========================================
    reorderBanners: builder.mutation({
      query: (orders) => ({
        url: '/api/v1/banners/reorder',
        method: 'put',
        data: { orders },
      }),
      invalidatesTags: [{ type: 'Banners', id: 'LIST' }],
    }),

    // ========================================
    // DELETE BANNER (soft-delete by default)
    // ========================================
    deleteBanner: builder.mutation({
      query: ({ bannerId, hard = false }) => ({
        url: `/api/v1/banners/${bannerId}`,
        method: 'delete',
        params: { hard },
      }),
      invalidatesTags: [{ type: 'Banners', id: 'LIST' }],
    }),

    // ========================================
    // UPLOAD BANNER IMAGE (via Cloudinary)
    // ========================================
    uploadBannerImage: builder.mutation({
      query: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: '/api/v1/upload/cloudinary-banner-image',
          method: 'post',
          data: formData,
        };
      },
    }),
  }),
});

export const {
  useGetAllBannersQuery,
  useCreateBannerMutation,
  useUpdateBannerMutation,
  useReorderBannersMutation,
  useDeleteBannerMutation,
  useUploadBannerImageMutation,
} = bannerApi;
