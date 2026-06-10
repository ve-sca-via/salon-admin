import { ITEMS_PER_PAGE } from '../config/constants';

export function paginateClient(items, currentPage, pageSize = ITEMS_PER_PAGE) {
  if (!items?.length) return [];
  const start = (currentPage - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

/** Infer total for server pages when API omits an exact count */
export function estimateTotalFromPage(items, currentPage, pageSize = ITEMS_PER_PAGE) {
  const loaded = (currentPage - 1) * pageSize + (items?.length || 0);
  return (items?.length || 0) === pageSize ? loaded + 1 : loaded;
}

export function buildTablePagination(currentPage, totalCount, pageSize = ITEMS_PER_PAGE) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalPages <= 1) return null;
  return { currentPage, pageSize, totalCount };
}

export function buildEstimatedPagination(currentPage, items, pageSize = ITEMS_PER_PAGE) {
  return buildTablePagination(
    currentPage,
    estimateTotalFromPage(items, currentPage, pageSize),
    pageSize
  );
}
