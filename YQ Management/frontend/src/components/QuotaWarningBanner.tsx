import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from './ui/button';

export function QuotaWarningBanner({ 
  resourceType, 
  frozenCount, 
  limit 
}: { 
  resourceType: string, 
  frozenCount: number, 
  limit: number 
}) {
  const [dismissed, setDismissed] = useState(false);

  if (frozenCount <= 0 || dismissed) return null;

  return (
    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-amber-800">
            {frozenCount} {frozenCount === 1 ? 'is' : 'are'} quota-locked
          </h3>
          <p className="text-sm text-amber-700 mt-1">
            Your current plan allows a maximum of <strong>{limit}</strong> {resourceType}. 
            The oldest ones are active, but the newest {frozenCount} have been frozen. 
            Customers cannot access frozen {resourceType}.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 ml-8 sm:ml-0 flex-shrink-0">
        <Link href="/dashboard/settings/billing">
          <Button variant="outline" className="border-amber-600 text-amber-700 hover:bg-amber-100 h-9 px-4">
            Upgrade Plan
          </Button>
        </Link>
        <button 
          onClick={() => setDismissed(true)}
          className="text-sm text-amber-700 hover:text-amber-900 font-medium"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
