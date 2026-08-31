import { Lock } from 'lucide-react';

export function QuotaLockedBadge() {
  return (
    <div className="absolute top-3 right-3 bg-amber-50 border border-amber-200 text-amber-700 px-2 py-1 rounded text-xs font-medium flex items-center gap-1 shadow-sm">
      <Lock className="w-3 h-3" />
      Quota Locked
    </div>
  );
}
