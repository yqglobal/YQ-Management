import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { toast } from 'sonner';

interface TokenListProps {
  tokens: Array<{ id: string; displayId?: string; customerName: string; status: string }>;
  queueId: string;
  nextQueueId: string | undefined;
}

export function TokenList({ tokens, queueId, nextQueueId }: TokenListProps) {
  const queryClient = useQueryClient();

  const completeTokenMutation = useMutation({
    mutationFn: (tokenId: string) => fetchApi(`/queue/tokens/${tokenId}/complete`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queueTokens', queueId] }),
    onError: () => toast.error('Error completing token'),
  });

  const transferTokenMutation = useMutation({
    mutationFn: ({ tokenId, targetQueueId }: { tokenId: string; targetQueueId: string }) =>
      fetchApi(`/visits/${tokenId}/transfer`, { method: 'POST', body: JSON.stringify({ nextQueueId: targetQueueId }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queueTokens', queueId] }),
    onError: () => toast.error('Error transferring token'),
  });

  if (tokens.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500 dark:text-zinc-500 font-medium">No waiting tickets</CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="p-6 border-b border-gray-200 dark:border-white/10">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Waiting tickets</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-white/10">
          {tokens.map((token, index) => (
            <div key={token.id} className="p-4 px-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 dark:text-zinc-400 font-bold">
                  {index + 1}
                </div>
                <div>
                  <p className="text-gray-900 dark:text-white font-medium">{token.customerName}</p>
                  <p className="text-gray-500 dark:text-zinc-500 text-sm font-mono">{token.displayId || token.id.substring(0, 5).toUpperCase()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${token.status === 'SERVING' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'}`}>
                  {token.status}
                </span>
                {nextQueueId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => transferTokenMutation.mutate({ tokenId: token.id, targetQueueId: nextQueueId })}
                    disabled={transferTokenMutation.isPending}
                    className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20"
                  >
                    Transfer
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => completeTokenMutation.mutate(token.id)}
                  disabled={completeTokenMutation.isPending}
                  className="p-2 text-gray-400 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-400/10 rounded-lg disabled:opacity-50"
                >
                  <CheckCircle className="w-5 h-5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}