import { createApi } from '@reduxjs/toolkit/query/react';
import axiosBaseQuery from './baseQuery';

export const careerApi = createApi({
  reducerPath: 'careerApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['CareerApplications'],
  endpoints: (builder) => ({
    // Get all career applications
    getCareerApplications: builder.query({
      query: ({ status, position, skip = 0, limit = 50 } = {}) => {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (position) params.append('position', position);
        params.append('skip', skip);
        params.append('limit', limit);
        
        return {
          url: `/api/v1/careers/applications?${params.toString()}`,
          method: 'GET'
        };
      },
      providesTags: ['CareerApplications']
    }),

    // Get single application
    getCareerApplication: builder.query({
      query: (applicationId) => ({
        url: `/api/v1/careers/applications/${applicationId}`,
        method: 'GET'
      }),
      providesTags: (result, error, applicationId) => [
        { type: 'CareerApplications', id: applicationId }
      ]
    }),

    // Update application status
    updateCareerApplication: builder.mutation({
      query: ({ applicationId, ...data }) => ({
        url: `/api/v1/careers/applications/${applicationId}`,
        method: 'PATCH',
        data
      }),
      invalidatesTags: (result, error, { applicationId }) => [
        'CareerApplications',
        { type: 'CareerApplications', id: applicationId }
      ]
    }),

    // Get document download URL
    getDocumentDownloadUrl: builder.query({
      query: ({ applicationId, documentType }) => ({
        url: `/api/v1/careers/applications/${applicationId}/download/${documentType}`,
        method: 'GET'
      })
    })
  })
});

export const {
  useGetCareerApplicationsQuery,
  useGetCareerApplicationQuery,
  useUpdateCareerApplicationMutation,
  useLazyGetDocumentDownloadUrlQuery
} = careerApi;
