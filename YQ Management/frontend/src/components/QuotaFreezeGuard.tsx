import { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { Button } from './ui/button';
import Link from 'next/link';

export function QuotaFreezeGuard({ 
  isFrozen, 
  children,
  resourceName
}: { 
  isFrozen: boolean, 
  children: ReactNode,
  resourceName: string
}) {
  if (!isFrozen) {
    return <>{children}</>;
  }

  return (
    <div className="relative group rounded-xl overflow-hidden border border-border shadow-sm">
      <div className="opacity-40 pointer-events-none grayscale transition-all">
        {children}
      </div>
      
      <div className="absolute inset-0 bg-background/5 backdrop-blur-[1px] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-background/90 p-4 rounded-xl shadow-lg border border-border max-w-[280px]">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock className="w-5 h-5 text-amber-600" />
          </div>
          <h4 className="font-semibold text-foreground mb-1">Quota Exceeded</h4>
          <p className="text-sm text-muted-foreground mb-4">
            This {resourceName} is frozen because your plan limits have been reached. 
            Customers cannot access it.
          </p>
          <Link href="/dashboard/settings/billing">
            <Button size="sm" className="w-full">
              Upgrade Plan
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
