/**
 * Coupon Management API - RTK Query
 *
 * Admin coupon CRUD (platform-wide + salon-scoped).
 * Mirrors the productApi / configApi axiosBaseQuery pattern.
 *
 * Note: the list endpoint returns a plain CouponResponse[] (not wrapped in `data`).
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import axiosBaseQuery from './baseQuery';

export const couponApi = createApi({
  reducerPath: 'couponApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Coupons', 'Coupon'],
  endpoints: (builder) => ({
    // ========================================
    // LIST (Admin — all coupons, optional filters)
    // ========================================
    getCoupons: builder.query({
      query: ({ scope, salon_id } = {}) => ({
        url: '/api/v1/admin/coupons',
        method: 'get',
        params: {
          ...(scope && { scope }),
          ...(salon_id && { salon_id }),
        },
      }),
      providesTags: (result) =>
        Array.isArray(result)
          ? [
              ...result.map(({ id }) => ({ type: 'Coupons', id })),
              { type: 'Coupons', id: 'LIST' },
            ]
          : [{ type: 'Coupons', id: 'LIST' }],
      keepUnusedDataFor: 300,
      refetchOnReconnect: true,
    }),

    // ========================================
    // GET SINGLE
    // ========================================
    getCoupon: builder.query({
      query: (couponId) => ({
        url: `/api/v1/admin/coupons/${couponId}`,
        method: 'get',
      }),
      providesTags: (result, error, couponId) => [{ type: 'Coupon', id: couponId }],
      keepUnusedDataFor: 300,
    }),

    // ========================================
    // CREATE
    // ========================================
    createCoupon: builder.mutation({
      query: (couponData) => ({
        url: '/api/v1/admin/coupons',
        method: 'post',
        data: couponData,
      }),
      invalidatesTags: [{ type: 'Coupons', id: 'LIST' }],
    }),

    // ========================================
    // UPDATE (PATCH — code & scope immutable)
    // ========================================
    updateCoupon: builder.mutation({
      query: ({ couponId, data }) => ({
        url: `/api/v1/admin/coupons/${couponId}`,
        method: 'patch',
        data,
      }),
      invalidatesTags: (result, error, { couponId }) => [
        { type: 'Coupon', id: couponId },
        { type: 'Coupons', id: 'LIST' },
      ],
    }),

    // ========================================
    // DEACTIVATE (DELETE — keeps history)
    // ========================================
    deactivateCoupon: builder.mutation({
      query: (couponId) => ({
        url: `/api/v1/admin/coupons/${couponId}`,
        method: 'delete',
      }),
      invalidatesTags: (result, error, couponId) => [
        { type: 'Coupon', id: couponId },
        { type: 'Coupons', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetCouponsQuery,
  useGetCouponQuery,
  useCreateCouponMutation,
  useUpdateCouponMutation,
  useDeactivateCouponMutation,
} = couponApi;
