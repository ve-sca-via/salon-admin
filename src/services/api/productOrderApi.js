import { createApi } from '@reduxjs/toolkit/query/react';
import axiosBaseQuery from './baseQuery';

export const productOrderApi = createApi({
  reducerPath: 'productOrderApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['ProductOrders'],
  endpoints: (builder) => ({
    getAllProductOrders: builder.query({
      query: () => ({
        url: '/api/v1/admin/product-orders/',
        method: 'get',
      }),
      providesTags: ['ProductOrders'],
    }),
    updateProductOrderStatus: builder.mutation({
      query: ({ orderId, status }) => ({
        url: `/api/v1/admin/product-orders/${orderId}/status`,
        method: 'patch',
        data: { status },
      }),
      invalidatesTags: ['ProductOrders'],
    }),
  }),
});

export const {
  useGetAllProductOrdersQuery,
  useUpdateProductOrderStatusMutation,
} = productOrderApi;
