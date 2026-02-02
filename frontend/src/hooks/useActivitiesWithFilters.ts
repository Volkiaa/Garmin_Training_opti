import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { activitiesApi } from '../lib/api';

const ITEMS_PER_PAGE = 10;

export function useActivitiesWithFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse URL parameters
  const page = parseInt(searchParams.get('page') || '1', 10);
  const disciplines = searchParams.getAll('disciplines');
  const sortBy = searchParams.get('sort_by') || 'date';
  const sortOrder = searchParams.get('sort_order') || 'desc';

  // Calculate offset from page
  const offset = (page - 1) * ITEMS_PER_PAGE;

  // Build query params for API
  const apiParams: {
    disciplines?: string[];
    sort_by?: string;
    sort_order?: string;
    limit: number;
    offset: number;
  } = {
    limit: ITEMS_PER_PAGE,
    offset,
  };

  if (disciplines.length > 0) {
    apiParams.disciplines = disciplines;
  }

  if (sortBy && sortBy !== 'date') {
    apiParams.sort_by = sortBy;
  }

  if (sortOrder && sortOrder !== 'desc') {
    apiParams.sort_order = sortOrder;
  }

  // Fetch activities
  const { data, isLoading, error } = useQuery({
    queryKey: ['activities', apiParams],
    queryFn: () => activitiesApi.list(apiParams),
  });

  // Navigation helpers
  const setPage = (newPage: number) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set('page', newPage.toString());
      return newParams;
    });
  };

  const toggleDiscipline = (discipline: string) => {
    setSearchParams((prev) => {
      const current = prev.getAll('disciplines');
      const updated = current.includes(discipline)
        ? current.filter((d) => d !== discipline)
        : [...current, discipline];

      const newParams = new URLSearchParams(prev);
      newParams.delete('disciplines');
      updated.forEach((d) => newParams.append('disciplines', d));
      newParams.set('page', '1');
      return newParams;
    });
  };

  const setSortBy = (field: string) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set('sort_by', field);
      newParams.set('page', '1');
      return newParams;
    });
  };

  const toggleSortOrder = () => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      const currentOrder = prev.get('sort_order') || 'desc';
      newParams.set('sort_order', currentOrder === 'desc' ? 'asc' : 'desc');
      return newParams;
    });
  };

  const totalPages = data ? Math.ceil(data.total / ITEMS_PER_PAGE) : 0;

  return {
    activities: data?.activities || [],
    total: data?.total || 0,
    totalPages,
    page,
    disciplines,
    sortBy,
    sortOrder,
    isLoading,
    error,
    setPage,
    toggleDiscipline,
    setSortBy,
    toggleSortOrder,
  };
}
