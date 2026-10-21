import { useState } from 'react';

export const usePagination = (initialLimit = 20) => {
  const [page, setPage] = useState(1);
  const [limit] = useState(initialLimit);
  const [total, setTotal] = useState(0);

  const totalPages = Math.ceil(total / limit);

  const goToPage = (p) => setPage(Math.max(1, Math.min(p, totalPages)));
  const nextPage = () => goToPage(page + 1);
  const prevPage = () => goToPage(page - 1);
  const resetPage = () => setPage(1);

  return { page, limit, total, setTotal, totalPages, goToPage, nextPage, prevPage, resetPage };
};
