import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { Play, SkipForward, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { toast } from 'sonner';

interface QueueControlsProps {
  queueId: string;
  servingToken: { id: string; status: string } | undefined;
}

export function QueueControls({ queueId, servingToken }: QueueControlsProps) {
  const queryClient = useQueryClient();
  const [showNextConfirm, setShowNextConfirm] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  const nextCustomerMutation = useMutation({
    mutationFn: () => fetchApi(`/queue/${queueId}/advance`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queueTokens', queueId] });
      setShowNextConfirm(false);
    },
    onError: () => toast.error('Error advancing queue'),
  });

  const skipTokenMutation = useMutation({
    mutationFn: (tokenId: string) => fetchApi(`/queue/tokens/${tokenId}/skip`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queueTokens', queueId] });
      setShowSkipConfirm(false);
    },
    onError: () => toast.error('Error skipping token'),
  });

  const handleNext = () => {
    if (servingToken) {
      setShowNextConfirm(true);
    } else {
      nextCustomerMutation.mutate();
    }
  };

  const handleSkip = () => {
    if (servingToken) {
      setShowSkipConfirm(true);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Queue controls</h2>
        <div className="grid grid-cols-2 gap-6">
          <Button
            onClick={handleNext}
            disabled={nextCustomerMutation.isPending}
            data-shortcut="next"
            className="flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-transform active:scale-95 disabled:opacity-50"
          >
            {nextCustomerMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
            Next customer
          </Button>

          <Button
            onClick={handleSkip}
            disabled={!servingToken || skipTokenMutation.isPending}
            data-shortcut="skip"
            className="flex items-center justify-center gap-2 py-4 bg-yellow-500/10 hover:bg-yellow-500/20 dark:bg-yellow-500/20 dark:hover:bg-yellow-500/30 text-yellow-600 dark:text-yellow-500 border border-yellow-500/20 rounded-xl font-bold text-lg transition-transform active:scale-95 shadow-sm dark:shadow-none disabled:opacity-50"
          >
            {skipTokenMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <SkipForward className="w-5 h-5" />}
            Skip
          </Button>
        </div>

        {showNextConfirm && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Confirm Next Customer</span>
            </div>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-3">This will advance the queue and serve the next customer in line.</p>
            <div className="flex gap-2">
              <Button
                onClick={() => { nextCustomerMutation.mutate(); setShowNextConfirm(false); }}
                disabled={nextCustomerMutation.isPending}
                className="px-4 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm font-medium"
              >
                {nextCustomerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
              </Button>
              <Button
                onClick={() => setShowNextConfirm(false)}
                variant="outline"
                className="px-4 py-1.5 text-gray-600 dark:text-zinc-400 rounded-lg text-sm font-medium"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {showSkipConfirm && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-sm font-medium text-red-700 dark:text-red-400">Confirm Skip Token</span>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              This will mark token <strong>{(servingToken as any)?.displayId || servingToken?.id.split('-')[0]}</strong> as completed and skip it. This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => { servingToken && skipTokenMutation.mutate(servingToken.id); setShowSkipConfirm(false); }}
                disabled={skipTokenMutation.isPending}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium"
              >
                {skipTokenMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Skip'}
              </Button>
              <Button
                onClick={() => setShowSkipConfirm(false)}
                variant="outline"
                className="px-4 py-1.5 text-gray-600 dark:text-zinc-400 rounded-lg text-sm font-medium"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}