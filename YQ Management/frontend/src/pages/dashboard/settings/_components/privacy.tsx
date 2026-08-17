import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../../../lib/api';
import { toast } from 'sonner';
import { Loader2, Download, ShieldCheck, Database } from 'lucide-react';

export default function PrivacySettings() {
  const [isExporting, setIsExporting] = useState(false);

  const { data: acceptedPolicies = [], isLoading } = useQuery({
    queryKey: ['policies', 'accepted'],
    queryFn: () => fetchApi('/policies/accepted'),
  });

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await fetchApi('/users/me/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qmova_data_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Data export downloaded successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-card dark:bg-dark-card rounded-[24px] border border-border dark:border-dark-border shadow-sm p-8 relative overflow-hidden mb-8">
      {/* Decorative left edge accent */}
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#8b5cf6]"></div>
      
      <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="material-symbols-outlined text-[#8b5cf6]" style={{ fontVariationSettings: "'FILL' 1" }}>privacy_tip</span>
            <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white tracking-tight font-semibold">Privacy Preferences</h2>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant dark:text-outline">Manage your accepted policies and personal data exports.</p>
        </div>
      </div>

      <div className="space-y-12">
        
        {/* Consent Section */}
        <section>
          <div className="flex items-center gap-2 mb-4 border-b border-border dark:border-dark-border pb-2">
            <ShieldCheck strokeWidth={1.5} className="w-5 h-5 text-on-surface-variant dark:text-outline" />
            <h3 className="font-headline-sm text-headline-sm text-on-surface dark:text-white tracking-tight font-semibold">
              Accepted Policies
            </h3>
          </div>
          <div className="bg-surface-bright dark:bg-zinc-900 rounded-2xl border border-border dark:border-dark-border divide-y divide-border dark:divide-dark-border overflow-hidden">
            {isLoading ? (
              <div className="p-8 flex justify-center text-outline">
                <Loader2 strokeWidth={1.5} className="w-5 h-5 animate-spin" />
              </div>
            ) : acceptedPolicies.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-center gap-4">
                <p className="text-outline font-body-sm">No policies accepted yet.</p>
                <button 
                  onClick={async () => {
                    try {
                      await fetchApi('/policies/accept', { method: 'POST', body: JSON.stringify({ type: 'TERMS_OF_SERVICE', version: '1.0' }) });
                      await fetchApi('/policies/accept', { method: 'POST', body: JSON.stringify({ type: 'PRIVACY_POLICY', version: '1.0' }) });
                      toast.success('Policies accepted');
                      window.location.reload();
                    } catch (e) {
                      toast.error('Failed to accept policies');
                    }
                  }}
                  className="px-4 py-2 bg-[#8b5cf6] text-white rounded-lg font-bold text-sm shadow-md"
                >
                  Accept Policies
                </button>
              </div>
            ) : (
              acceptedPolicies.map((acceptance: any) => (
                <div key={acceptance.id} className="flex justify-between items-center p-6 hover:bg-surface-container-lowest dark:hover:bg-white/5 transition-colors gap-4">
                  <div>
                    <h4 className="font-body-md font-bold text-on-surface dark:text-white capitalize">
                      {acceptance.policy.type.replace(/_/g, ' ').toLowerCase()}
                    </h4>
                    <p className="font-data-mono text-[13px] text-on-surface-variant dark:text-outline mt-1">
                      Version {acceptance.policy.version} • Accepted on {new Date(acceptance.acceptedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      const url = acceptance.policy.type === 'TERMS_OF_SERVICE' 
                        ? '/docs/legal/terms-of-service' 
                        : '/docs/legal/privacy-policy';
                      window.open(url, '_blank');
                    }}
                    className="h-[36px] px-4 rounded-lg bg-surface-container-low dark:bg-white/5 hover:bg-surface-container-highest dark:hover:bg-white/10 text-on-surface dark:text-white font-body-sm font-semibold transition-colors border border-border dark:border-dark-border shrink-0"
                  >
                    View
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Data Export */}
        <section>
          <div className="flex items-center gap-2 mb-4 border-b border-border dark:border-dark-border pb-2">
            <Database strokeWidth={1.5} className="w-5 h-5 text-on-surface-variant dark:text-outline" />
            <h3 className="font-headline-sm text-headline-sm text-on-surface dark:text-white tracking-tight font-semibold">
              Data Export
            </h3>
          </div>
          <div className="bg-surface-bright dark:bg-zinc-900 rounded-2xl p-6 border border-border dark:border-dark-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-body-sm text-on-surface-variant dark:text-outline max-w-lg">
                Request an export of all your personal and workspace data in CSV/JSON format. This process may take a few moments depending on data size.
              </p>
            </div>
            <button 
              onClick={handleExportData}
              disabled={isExporting}
              className="h-[44px] px-6 rounded-lg border border-border dark:border-dark-border bg-white dark:bg-black/50 hover:bg-surface-container-low dark:hover:bg-white/10 font-body-md font-semibold text-on-surface dark:text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 shadow-sm"
            >
              {isExporting ? <Loader2 strokeWidth={1.5} className="w-5 h-5 animate-spin" /> : <Download strokeWidth={1.5} className="w-5 h-5" />}
              {isExporting ? 'Exporting...' : 'Request Data Export'}
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
