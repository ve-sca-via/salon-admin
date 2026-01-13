/**
 * Skeleton Loading Components for Admin Panel
 * 
 * Purpose:
 * Provide smooth loading states with skeleton screens instead of spinners.
 * Improves perceived performance and reduces layout shift in admin interface.
 * 
 * Features:
 * - Shimmer animation effect
 * - Multiple skeleton types (stat cards, table rows, forms)
 * - Matches admin panel design system
 */

import React from 'react';

/**
 * Base Skeleton with shimmer effect
 */
const SkeletonBase = ({ className = '', style = {} }) => {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] ${className}`}
      style={{
        animation: 'shimmer 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  );
};

/**
 * Skeleton Stat Card - for dashboard statistics
 */
export const SkeletonStatCard = () => {
  return (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <SkeletonBase className="h-4 w-32 rounded" />
        <SkeletonBase className="h-8 w-8 rounded-full" />
      </div>
      <SkeletonBase className="h-8 w-20 rounded mb-2" />
      <SkeletonBase className="h-3 w-40 rounded" />
    </div>
  );
};

/**
 * Skeleton Table Row
 */
export const SkeletonTableRow = ({ columns = 4 }) => {
  return (
    <tr className="border-b border-gray-200 animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <SkeletonBase className="h-4 w-full rounded" />
        </td>
      ))}
    </tr>
  );
};

/**
 * Skeleton Table - complete table with header
 */
export const SkeletonTable = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-6 py-3 text-left">
                <SkeletonBase className="h-4 w-24 rounded" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Skeleton Form Field
 */
export const SkeletonFormField = () => {
  return (
    <div className="mb-4 animate-pulse">
      <SkeletonBase className="h-4 w-32 rounded mb-2" />
      <SkeletonBase className="h-10 w-full rounded-lg" />
    </div>
  );
};

/**
 * Skeleton Activity Feed Item
 */
export const SkeletonActivityItem = () => {
  return (
    <div className="flex items-start gap-3 p-4 border-b border-gray-100 animate-pulse">
      <SkeletonBase className="h-10 w-10 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <SkeletonBase className="h-4 w-3/4 rounded mb-2" />
        <SkeletonBase className="h-3 w-1/2 rounded" />
      </div>
      <SkeletonBase className="h-3 w-16 rounded" />
    </div>
  );
};

/**
 * Skeleton Card - generic content card
 */
export const SkeletonCard = () => {
  return (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      <SkeletonBase className="h-6 w-48 rounded mb-4" />
      <div className="space-y-3">
        <SkeletonBase className="h-4 w-full rounded" />
        <SkeletonBase className="h-4 w-5/6 rounded" />
        <SkeletonBase className="h-4 w-4/6 rounded" />
      </div>
    </div>
  );
};

// Add shimmer animation to global styles
if (typeof document !== 'undefined') {
  const styleId = 'skeleton-shimmer-styles';
  if (!document.getElementById(styleId)) {
    const styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = `
      @keyframes shimmer {
        0% {
          background-position: -200% 0;
        }
        100% {
          background-position: 200% 0;
        }
      }
    `;
    document.head.appendChild(styleSheet);
  }
}

export default SkeletonBase;
