/**
 * Feature Entitlement API - RTK Query
 *
 * Backend: app/api/features.py
 *
 * Drives which nav items and routes the panel renders. This is UX only —
 * every gated endpoint enforces its own check server-side and returns 404,
 * so a user who forces their way to a hidden route finds nothing there.
 *
 * The /admin endpoints are internal-staff-only and 404 for client admins,
 * which is why the Feature Flags page is itself gated on `is_internal`
 * rather than on a feature flag.
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import axiosBaseQuery from './baseQuery';

export const featureApi = createApi({
  reducerPath: 'featureApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Features'],
  endpoints: (builder) => ({

    // ========================================
    // ENTITLEMENT MAP (any admin)
    // ========================================
    // Returns { features: { key: status }, is_internal }.
    // Client admins receive ONLY entitled features — unsold ones are absent
    // from the payload entirely, not present-and-disabled.
    getMyFeatures: builder.query({
      query: () => ({
        url: '/api/v1/features',
        method: 'get',
      }),
      providesTags: [{ type: 'Features', id: 'MAP' }],
      // Read on nearly every screen and changed by hand a few times a year.
      keepUnusedDataFor: 900,
    }),

    // ========================================
    // REGISTRY MANAGEMENT (internal only)
    // ========================================
    getAllFeatures: builder.query({
      query: () => ({
        url: '/api/v1/features/admin/all',
        method: 'get',
      }),
      providesTags: [{ type: 'Features', id: 'LIST' }],
    }),

    updateFeatureStatus: builder.mutation({
      query: ({ key, status }) => ({
        url: `/api/v1/features/admin/${key}`,
        method: 'patch',
        data: { status },
      }),
      // Invalidate the map too: flipping a feature changes the sidebar for
      // everyone, so the panel must re-render without a reload.
      invalidatesTags: [
        { type: 'Features', id: 'LIST' },
        { type: 'Features', id: 'MAP' },
      ],
    }),
  }),
});

export const {
  useGetMyFeaturesQuery,
  useGetAllFeaturesQuery,
  useUpdateFeatureStatusMutation,
} = featureApi;
