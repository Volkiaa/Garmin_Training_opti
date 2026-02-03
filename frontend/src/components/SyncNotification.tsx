import { useEffect, useState } from 'react';
import { useSyncWebSocket } from '../hooks/useSyncWebSocket';
import { useQueryClient } from '@tanstack/react-query';

export function SyncNotification() {
  const { connected, lastUpdate } = useSyncWebSocket();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'info';
    visible: boolean;
  } | null>(null);
  
  useEffect(() => {
    if (!lastUpdate) return;
    
    if (lastUpdate.update_type === 'new_activities' && lastUpdate.activities_synced > 0) {
      setToast({
        message: `${lastUpdate.activities_synced} new activities synced`,
        type: 'success',
        visible: true,
      });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    } else if (lastUpdate.update_type === 'dashboard_updated') {
      setToast({
        message: 'Dashboard updated with latest data',
        type: 'info',
        visible: true,
      });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
    
    const timer = setTimeout(() => {
      setToast(prev => prev ? { ...prev, visible: false } : null);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [lastUpdate, queryClient]);
  
  if (!toast?.visible) {
    return (
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            connected ? 'bg-green-500' : 'bg-red-500'
          }`}
          title={connected ? 'Connected' : 'Disconnected'}
        />
      </div>
    );
  }
  
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
      <div
        className={`px-4 py-3 rounded-lg shadow-lg text-white font-medium transition-all duration-300 ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-blue-600'
        }`}
      >
        {toast.message}
      </div>
      <div
        className={`w-2 h-2 rounded-full ${
          connected ? 'bg-green-500' : 'bg-red-500'
        }`}
        title={connected ? 'Connected' : 'Disconnected'}
      />
    </div>
  );
}
