import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';

export function useWhatsapp() {
  const qc = useQueryClient();

  const statusQuery = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: () => fetchApi('/whatsapp/status'),
    refetchInterval: (data: any) => {
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
    refetchInterval: 2000,
    retry: false,
    staleTime: 1000,
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const status = await fetchApi('/whatsapp/status');
      if (status?.state === 'open') return status;
      if (status?.state === 'connecting' && status.qr) return status;
      return fetchApi('/whatsapp/connect', { method: 'POST' });
    },
    onSuccess: () => qc.invalidateQueries(['whatsapp-status', 'whatsapp-cached-qr']),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => fetchApi('/whatsapp/disconnect', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries(['whatsapp-status', 'whatsapp-logs', 'whatsapp-cached-qr']),
  });

  const pairingCodeMutation = useMutation({
    mutationFn: (phone: string) =>
      fetchApi('/whatsapp/pairing-code', { method: 'POST', body: JSON.stringify({ phoneNumber: phone }) }),
    onSuccess: () => qc.invalidateQueries(['whatsapp-status']),
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
