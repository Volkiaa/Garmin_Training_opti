import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activitiesApi } from '../lib/api';

export function useActivities(
  params?: { start_date?: string; end_date?: string; discipline?: string; limit?: number; offset?: number }
) {
  return useQuery({
    queryKey: ['activities', params],
    queryFn: () => activitiesApi.list(params),
  });
}

export function useActivity(id: number) {
  return useQuery({
    queryKey: ['activity', id],
    queryFn: () => activitiesApi.get(id),
    enabled: !!id,
  });
}

export function useUpdateActivity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof activitiesApi.update>[1] }) =>
      activitiesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['activity', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
