/**
 * Blog Management API - RTK Query
 *
 * Admin CRUD for the SEO blog (backend: app/api/blog.py).
 * Uses the same axiosBaseQuery pattern as bannerApi, productApi, etc.
 *
 * Note the admin/public split: the editor loads posts by UUID via
 * /blog/admin/{id} because the public /blog/{slug} route 404s on drafts.
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import axiosBaseQuery from './baseQuery';

export const blogApi = createApi({
  reducerPath: 'blogApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['BlogPosts', 'BlogPost', 'BlogTags'],
  endpoints: (builder) => ({

    // ========================================
    // LIST (Admin — includes drafts & archived)
    // ========================================
    getAllBlogPosts: builder.query({
      query: ({ status, search, limit = 25, offset = 0 } = {}) => ({
        url: '/api/v1/blog/admin/all',
        method: 'get',
        params: {
          ...(status ? { status } : {}),
          ...(search ? { search } : {}),
          limit,
          offset,
        },
      }),
      providesTags: (result) =>
        result?.posts
          ? [
              ...result.posts.map(({ id }) => ({ type: 'BlogPosts', id })),
              { type: 'BlogPosts', id: 'LIST' },
            ]
          : [{ type: 'BlogPosts', id: 'LIST' }],
      keepUnusedDataFor: 60,
      refetchOnReconnect: true,
    }),

    // ========================================
    // SINGLE POST BY ID (Admin — any status)
    // ========================================
    getBlogPostById: builder.query({
      query: (postId) => ({
        url: `/api/v1/blog/admin/${postId}`,
        method: 'get',
      }),
      providesTags: (result, error, postId) => [{ type: 'BlogPost', id: postId }],
    }),

    // ========================================
    // TAGS (public — powers the tag suggestions)
    // ========================================
    getBlogTags: builder.query({
      query: () => ({
        url: '/api/v1/blog/tags',
        method: 'get',
      }),
      providesTags: [{ type: 'BlogTags', id: 'LIST' }],
    }),

    // ========================================
    // CREATE POST
    // ========================================
    createBlogPost: builder.mutation({
      query: (postData) => ({
        url: '/api/v1/blog',
        method: 'post',
        data: postData,
      }),
      invalidatesTags: [
        { type: 'BlogPosts', id: 'LIST' },
        { type: 'BlogTags', id: 'LIST' },
      ],
    }),

    // ========================================
    // UPDATE POST
    // ========================================
    updateBlogPost: builder.mutation({
      query: ({ postId, data }) => ({
        url: `/api/v1/blog/${postId}`,
        method: 'put',
        data,
      }),
      invalidatesTags: (result, error, { postId }) => [
        { type: 'BlogPost', id: postId },
        { type: 'BlogPosts', id: 'LIST' },
        { type: 'BlogTags', id: 'LIST' },
      ],
    }),

    // ========================================
    // DELETE POST (archives by default)
    // ========================================
    // The backend default archives rather than deleting, which keeps the slug
    // reserved so an already-indexed URL can never be reused by a new article.
    deleteBlogPost: builder.mutation({
      query: ({ postId, hard = false }) => ({
        url: `/api/v1/blog/${postId}`,
        method: 'delete',
        params: { hard },
      }),
      invalidatesTags: [{ type: 'BlogPosts', id: 'LIST' }],
    }),

    // ========================================
    // UPLOAD BLOG IMAGE (via Cloudinary)
    // ========================================
    // Used for both the cover image and images inserted into the article body.
    uploadBlogImage: builder.mutation({
      query: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: '/api/v1/upload/cloudinary-blog-image',
          method: 'post',
          data: formData,
        };
      },
    }),
  }),
});

export const {
  useGetAllBlogPostsQuery,
  useGetBlogPostByIdQuery,
  useGetBlogTagsQuery,
  useCreateBlogPostMutation,
  useUpdateBlogPostMutation,
  useDeleteBlogPostMutation,
  useUploadBlogImageMutation,
} = blogApi;
