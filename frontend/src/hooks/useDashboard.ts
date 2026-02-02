import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from '../lib/api';

export function useDashboard(version?: 'v1' | 'v2') {
  return useQuery({
    queryKey: ['dashboard', version],
    queryFn: () => dashboardApi.get(version),
    refetchInterval: 5 * 60 * 1000,
  });
}
