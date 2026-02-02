import { useMutation, useQueryClient } from '@tanstack/react-query';
import { syncApi } from '../lib/api';

interface SyncParams {
  days?: number;
  fullSync?: boolean;
}

export function useTriggerSync() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: SyncParams = {}) => 
      syncApi.trigger(params.days || 28, params.fullSync || false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}
