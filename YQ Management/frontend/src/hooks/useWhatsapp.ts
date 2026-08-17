import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../components/AuthContext';

import { getBackendUrl } from '../lib/api';

const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || getBackendUrl();

export function useWhatsapp() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user?.tenantId) return;

    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, { transports: ['websocket'] });
      
      socketRef.current.on('connect', () => {
        socketRef.current?.emit('joinTenantRoom', user.tenantId);
      });

      socketRef.current.on('whatsapp_connection_update', (payload: any) => {
        console.log('[WhatsApp Socket] Received connection update:', payload);
        
        // Instantly update the status query cache
        qc.setQueryData(['whatsapp-status'], (old: any) => {
          return {
            ...old,
            instanceName: payload.instanceName || old?.instanceName,
            state: payload.state || old?.state,
            qr: payload.qr || old?.qr,
            qrType: payload.qrType || old?.qrType,
          };
        });

        // Instantly update cached QR query cache if a QR is provided
        if (payload.qr) {
           qc.setQueryData(['whatsapp-cached-qr'], { qr: payload.qr });
        }
        
        // Also invalidate to fetch fresh full state if needed, though cache is optimistic
        qc.invalidateQueries({ queryKey: ['whatsapp-status'] });
        qc.invalidateQueries({ queryKey: ['whatsapp-cached-qr'] });
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user?.tenantId, qc]);

  const statusQuery = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: () => fetchApi('/whatsapp/status'),
    refetchInterval: (data: any) => {
      // Fast polling (1.5s) when waiting for QR scan so the UI updates instantly
      // even if WebSockets are blocked by proxies/firewalls.
      if (data?.qr || data?.state === 'connecting') return 1500;
      return 30000;
    },
  });

  const logsQuery = useQuery({
    queryKey: ['whatsapp-logs'],
    queryFn: () => fetchApi('/whatsapp/logs'),
    refetchInterval: 2500,
  });

  const cachedQrQuery = useQuery({
    queryKey: ['whatsapp-cached-qr'],
    queryFn: () => fetchApi('/whatsapp/cached-qr'),
    refetchInterval: 10000, // Relaxed from 1s due to WebSocket push
    retry: false,
    staleTime: 500,
  });

  const connectMutation = useMutation({
    mutationFn: async (forceRefresh?: boolean) => {
      console.log('[WhatsApp] Initiating connection request... forceRefresh:', forceRefresh);
      const status = await fetchApi('/whatsapp/status');
      console.log('[WhatsApp] Current status before connect:', status);
      if (status?.state === 'open') return status;
      if (!forceRefresh && status?.state === 'connecting' && status.qr) return status;
      const res = await fetchApi('/whatsapp/connect', { 
        method: 'POST',
        body: JSON.stringify({ forceRefresh })
      });
      console.log('[WhatsApp] Connect response:', res);
      return res;
    },
    onSuccess: (data) => {
      console.log('[WhatsApp] Connect mutation successful:', data);
      qc.invalidateQueries({ queryKey: ['whatsapp-status'] });
      qc.invalidateQueries({ queryKey: ['whatsapp-cached-qr'] });
    },
    onError: (error) => {
      console.error('[WhatsApp] Connect mutation failed:', error);
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: () => fetchApi('/whatsapp/disconnect', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-status'] });
      qc.invalidateQueries({ queryKey: ['whatsapp-logs'] });
      qc.invalidateQueries({ queryKey: ['whatsapp-cached-qr'] });
    },
  });

  const pairingCodeMutation = useMutation({
    mutationFn: (phone: string) =>
      fetchApi('/whatsapp/pairing-code', { method: 'POST', body: JSON.stringify({ phoneNumber: phone }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp-status'] }),
  });

  const testMutation = useMutation({
    mutationFn: (data: any) => fetchApi('/whatsapp/test', { method: 'POST', body: JSON.stringify(data) }),
  });

  return {
    statusQuery,
    logsQuery,
    cachedQrQuery,
    connectMutation,
    disconnectMutation,
    pairingCodeMutation,
    testMutation,
  };
}

export default useWhatsapp;
