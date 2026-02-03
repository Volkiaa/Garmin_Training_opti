import { useEffect, useRef, useState, useCallback } from 'react';

interface SyncUpdate {
  type: 'sync_update';
  update_type: 'new_activities' | 'dashboard_updated';
  sync_timestamp: string;
  activities_synced: number;
  health_days: number;
}

interface WebSocketState {
  connected: boolean;
  lastUpdate: SyncUpdate | null;
  error: Error | null;
}

export function useSyncWebSocket() {
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    lastUpdate: null,
    error: null,
  });
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  
  const connect = useCallback(() => {
    const wsUrl = `ws://${window.location.hostname}:8000/api/v1/ws/sync`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        setState(prev => ({ ...prev, connected: true, error: null }));
        reconnectAttemptsRef.current = 0;
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'sync_update') {
            setState(prev => ({ ...prev, lastUpdate: data as SyncUpdate }));
          } else if (data.type === 'connected') {
            console.log('WebSocket connected:', data.message);
          } else if (data.type === 'ping') {
            ws.send('pong');
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };
      
      ws.onerror = () => {
        setState(prev => ({ ...prev, error: new Error('WebSocket error') }));
      };
      
      ws.onclose = () => {
        setState(prev => ({ ...prev, connected: false }));
        wsRef.current = null;
        
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };
    } catch (err) {
      setState(prev => ({ ...prev, error: err as Error }));
    }
  }, []);
  
  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);
  
  return state;
}
