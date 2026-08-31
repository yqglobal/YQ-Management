import { Dialog, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { AlertTriangle, Lock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';

interface DowngradeWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  targetPlan: any;
}

export function DowngradeWarningModal({ isOpen, onClose, onConfirm, targetPlan }: DowngradeWarningModalProps) {
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && targetPlan) {
      setLoading(true);
      fetchApi(`/billing/subscriptions/downgrade-preview?planId=${targetPlan.id}`)
        .then(res => setPreview(res))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setPreview(null);
    }
  }, [isOpen, targetPlan]);

  const hasExcess = preview && (preview.queues.excess > 0 || preview.locations.excess > 0 || preview.services.excess > 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose} className="sm:max-w-[500px]">
      <div className="mb-4">
        <DialogTitle className="flex items-center gap-2 text-xl mb-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Downgrade to {targetPlan?.name}
        </DialogTitle>
        <DialogDescription>
          You are about to downgrade your plan. This will take effect immediately.
        </DialogDescription>
      </div>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Checking quota limits...</div>
        ) : hasExcess ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 my-4">
            <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Quota Exceeded
            </h4>
            <p className="text-sm text-amber-700 mb-4">
              Your current usage exceeds the limits of the {targetPlan?.name} plan. 
              The oldest items will remain active, but the newest items will be temporarily frozen until you upgrade or delete items.
            </p>
            <ul className="space-y-2 text-sm text-amber-800 font-medium">
              {preview.queues.excess > 0 && (
                <li>• {preview.queues.excess} {preview.queues.excess === 1 ? 'Queue' : 'Queues'} will be frozen</li>
              )}
              {preview.locations.excess > 0 && (
                <li>• {preview.locations.excess} {preview.locations.excess === 1 ? 'Location' : 'Locations'} will be frozen</li>
              )}
              {preview.services.excess > 0 && (
                <li>• {preview.services.excess} {preview.services.excess === 1 ? 'Service' : 'Services'} will be frozen</li>
              )}
            </ul>
          </div>
        ) : preview ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 my-4">
            <p className="text-sm text-emerald-800">
              Good news! Your current usage fits perfectly within the {targetPlan?.name} plan limits. 
              No items will be frozen.
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="default" onClick={onConfirm} disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white">
            Confirm Downgrade
          </Button>
        </div>
    </Dialog>
  );
}
