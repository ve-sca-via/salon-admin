import { createApi } from '@reduxjs/toolkit/query/react';
import axiosBaseQuery from './baseQuery';

export const partnerApi = createApi({
  reducerPath: 'partnerApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['PartnerRequests'],
  endpoints: (builder) => ({
    // Get all partner requests
    getPartnerRequests: builder.query({
      query: ({ status, shop_type, search, skip = 0, limit = 50 } = {}) => {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (shop_type) params.append('shop_type', shop_type);
        if (search?.trim()) params.append('search', search.trim());
        params.append('skip', skip);
        params.append('limit', limit);

        return {
          url: `/api/v1/partners/requests?${params.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['PartnerRequests'],
      keepUnusedDataFor: 300,
      refetchOnReconnect: true,
      refetchOnMountOrArgChange: true,
    }),

    // Update partner request status
    updatePartnerRequest: builder.mutation({
      query: ({ requestId, ...data }) => ({
        url: `/api/v1/partners/requests/${requestId}`,
        method: 'PATCH',
        data,
      }),
      invalidatesTags: (result, error, { requestId }) => [
        'PartnerRequests',
        { type: 'PartnerRequests', id: requestId },
      ],
    }),
  }),
});

export const {
  useGetPartnerRequestsQuery,
  useUpdatePartnerRequestMutation,
} = partnerApi;
