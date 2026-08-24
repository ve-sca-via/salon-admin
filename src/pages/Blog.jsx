/**
 * Blog.jsx - Admin Blog Post Management
 *
 * The list screen for the SEO blog:
 * - Table of every post including drafts, scheduled and archived
 * - Status / search filters and server-side pagination
 * - Archive (keeps the slug reserved) and restore-to-draft
 *
 * Authoring happens in BlogEditor.jsx (/blog/new, /blog/:postId/edit).
 * Follows the same patterns as Coupons.jsx (Card, Table, Badge, Button, toast).
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useGetAllBlogPostsQuery,
  useUpdateBlogPostMutation,
  useDeleteBlogPostMutation,
} from '../services/api/blogApi';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/FormElements';
import { Table } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { describeStatus } from '../utils/blogStatus';
import { toast } from 'react-toastify';

const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:3000';
const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

// =====================================================
// HELPERS
// =====================================================

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

// =====================================================
// COMPONENT
// =====================================================
const Blog = () => {
  const navigate = useNavigate();

  // ---- Filters / paging ----
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useGetAllBlogPostsQuery({
    status: statusFilter || undefined,
    search: search || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const [updatePost] = useUpdateBlogPostMutation();
  const [deletePost] = useDeleteBlogPostMutation();

  const posts = data?.posts || [];
  const total = data?.total ?? posts.length;

  // Search is submitted rather than typed-through: the backend does a
  // substring match on the whole phrase, so firing on every keystroke would
  // spend requests on prefixes that match nothing.
  const applySearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const changeStatus = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  // ---- Archive (soft delete) ----
  const handleArchive = async (post) => {
    const warning = post.status === 'published'
      ? `\n\n"${post.title}" is live. Archiving removes it from the site and from search results.`
      : '';
    if (!window.confirm(`Archive this post?${warning}\n\nThe slug stays reserved so the URL can never be reused by a different article.`)) {
      return;
    }
    try {
      await deletePost({ postId: post.id }).unwrap();
      toast.success('Post archived');
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to archive post');
    }
  };

  // ---- Restore ----
  const handleRestore = async (post) => {
    try {
      await updatePost({ postId: post.id, data: { status: 'draft' } }).unwrap();
      toast.success('Post restored as a draft');
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to restore post');
    }
  };

  // =====================================================
  // TABLE COLUMNS
  // =====================================================
  const columns = [
    {
      header: 'Title',
      accessor: 'title',
      cell: (post) => (
        <div className="max-w-md">
          <Link
            to={`/blog/${post.id}/edit`}
            className="font-medium text-gray-900 hover:text-blue-600 line-clamp-2"
          >
            {post.title}
          </Link>
          <p className="text-xs text-gray-500 mt-0.5 truncate">/blog/{post.slug}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (post) => {
        const { label, variant } = describeStatus(post);
        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    {
      header: 'Published',
      accessor: 'published_at',
      cell: (post) => (
        <span className="text-gray-600">{formatDate(post.published_at)}</span>
      ),
    },
    {
      header: 'Focus keyword',
      accessor: 'focus_keyword',
      cell: (post) =>
        post.focus_keyword ? (
          <span className="text-gray-700">{post.focus_keyword}</span>
        ) : (
          <span className="text-amber-600" title="Set a focus keyword on the SEO tab">
            Not set
          </span>
        ),
    },
    {
      header: 'Read time',
      accessor: 'reading_minutes',
      cell: (post) => <span className="text-gray-500">{post.reading_minutes || 1} min</span>,
    },
    {
      header: 'Actions',
      accessor: 'actions',
      cell: (post) => (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate(`/blog/${post.id}/edit`)}>
            Edit
          </Button>

          {describeStatus(post).label === 'Live' && (
            <a
              href={`${FRONTEND_URL}/blog/${post.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg border-2 border-gray-300 text-gray-700 hover:border-gray-400"
            >
              View
            </a>
          )}

          {post.status === 'archived' ? (
            <Button size="sm" variant="success" onClick={() => handleRestore(post)}>
              Restore
            </Button>
          ) : (
            <Button size="sm" variant="danger" onClick={() => handleArchive(post)}>
              Archive
            </Button>
          )}
        </div>
      ),
    },
  ];

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog</h1>
          <p className="mt-1 text-sm text-gray-500">
            Write and publish articles that bring search traffic to Lubist ({total} post
            {total !== 1 ? 's' : ''}).
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('/blog/new')}>
          + New Post
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <form onSubmit={applySearch} className="flex-1 flex gap-2 items-end">
            <div className="flex-1">
              <Input
                label="Search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Title, excerpt or focus keyword"
              />
            </div>
            <Button type="submit" variant="secondary">Search</Button>
          </form>

          <div className="w-full sm:w-52">
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => changeStatus(e.target.value)}
              options={STATUS_OPTIONS}
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className={isFetching && !isLoading ? 'opacity-60 transition-opacity' : ''}>
        <Table
          columns={columns}
          data={posts}
          isLoading={isLoading}
          pagination={{ currentPage: page, pageSize: PAGE_SIZE, totalCount: total }}
          onPageChange={setPage}
        />

        {!isLoading && posts.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-gray-500">
              {search || statusFilter ? 'No posts match these filters.' : 'No posts yet.'}
            </p>
            {!search && !statusFilter && (
              <Button variant="primary" className="mt-4" onClick={() => navigate('/blog/new')}>
                Write the first post
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Blog;
