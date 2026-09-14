import React from 'react';

interface TenantSupportFooterProps {
  tenant: {
    supportEmail?: string;
    supportPhone?: string;
    showSupportInfo?: boolean;
    [key: string]: any;
  } | null;
}

export function TenantSupportFooter({ tenant }: TenantSupportFooterProps) {
  if (!tenant) return null;
  
  // Default to true if undefined (for backwards compatibility if needed)
  const showSupport = tenant.showSupportInfo !== false;
  const hasContactInfo = !!tenant.supportEmail || !!tenant.supportPhone;

  if (!showSupport || !hasContactInfo) return null;

  return (
    <div className="w-full text-center mt-12 pt-6 pb-8 border-t border-border">
      <p className="text-sm text-on-surface-variant font-medium mb-2">Need help?</p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
        {tenant.supportEmail && (
          <a
            href={`mailto:${tenant.supportEmail}`}
            className="flex items-center gap-1.5 text-primary hover:text-primary-container transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">mail</span>
            {tenant.supportEmail}
          </a>
        )}
        
        {tenant.supportEmail && tenant.supportPhone && (
          <span className="hidden sm:inline text-on-surface-variant/30">•</span>
        )}
        
        {tenant.supportPhone && (
          <a
            href={`tel:${tenant.supportPhone}`}
            className="flex items-center gap-1.5 text-primary hover:text-primary-container transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">call</span>
            {tenant.supportPhone}
          </a>
        )}
      </div>
    </div>
  );
}
