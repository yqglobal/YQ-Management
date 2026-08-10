import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';

export function useWhatsapp() {
  const qc = useQueryClient();

  const statusQuery = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: () => fetchApi('/whatsapp/status'),
    refetchInterval: (data: any) => {
      if (data?.qr || data?.state === 'connecting') return 1000;
      return 15000;
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
    refetchInterval: 1000,
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
