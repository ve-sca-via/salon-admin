import { createApi } from '@reduxjs/toolkit/query/react';
import axiosBaseQuery from './baseQuery';

export const productOrderApi = createApi({
  reducerPath: 'productOrderApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['ProductOrders', 'ProductOrderEvents'],
  endpoints: (builder) => ({
    getAllProductOrders: builder.query({
      query: () => ({
        url: '/api/v1/admin/product-orders/',
        method: 'get',
      }),
      providesTags: ['ProductOrders'],
    }),
    // extra: courier_name / tracking_number / tracking_url / restock / note
    updateProductOrderStatus: builder.mutation({
      query: ({ orderId, status, ...extra }) => ({
        url: `/api/v1/admin/product-orders/${orderId}/status`,
        method: 'patch',
        data: { status, ...extra },
      }),
      invalidatesTags: (result, error, { orderId }) => [
        'ProductOrders',
        { type: 'ProductOrderEvents', id: orderId },
      ],
    }),
    updateProductOrderShipment: builder.mutation({
      query: ({ orderId, ...fields }) => ({
        url: `/api/v1/admin/product-orders/${orderId}/shipment`,
        method: 'patch',
        data: fields,
      }),
      invalidatesTags: (result, error, { orderId }) => [
        'ProductOrders',
        { type: 'ProductOrderEvents', id: orderId },
      ],
    }),
    getProductOrderEvents: builder.query({
      query: (orderId) => ({
        url: `/api/v1/admin/product-orders/${orderId}/events`,
        method: 'get',
      }),
      transformResponse: (res) => res?.events || [],
      providesTags: (result, error, orderId) => [{ type: 'ProductOrderEvents', id: orderId }],
    }),
  }),
});

export const {
  useGetAllProductOrdersQuery,
  useUpdateProductOrderStatusMutation,
  useUpdateProductOrderShipmentMutation,
  useGetProductOrderEventsQuery,
} = productOrderApi;
