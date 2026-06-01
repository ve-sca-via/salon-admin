import { useState, useEffect, useCallback, useMemo } from 'react';
import { ITEMS_PER_PAGE } from '../config/constants';

/** Pass filter values as arguments so page resets when they change (e.g. usePagination(roleFilter, search)) */
export function usePagination(...resetDeps) {
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, resetDeps);

  const onPageChange = useCallback((page) => {
    setCurrentPage(Math.max(1, page));
  }, []);

  const offset = useMemo(() => (currentPage - 1) * ITEMS_PER_PAGE, [currentPage]);
  const skip = offset;

  return {
    currentPage,
    onPageChange,
    offset,
    skip,
    page: currentPage,
    pageSize: ITEMS_PER_PAGE,
  };
}
