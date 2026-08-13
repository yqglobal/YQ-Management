import React, { useState } from 'react';
import SettingsLayout from '../../../components/SettingsLayout';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../../lib/api';
import { toast } from 'sonner';
import { Loader2, Download } from 'lucide-react';

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
    <SettingsLayout pageTitle="Privacy Dashboard" pageSubtitle="Manage your data and consent">
      <div className="p-6 md:p-8 max-w-4xl space-y-12">
        
        {/* Consent Section */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-white/10 pb-2">
            Accepted Policies
          </h3>
          <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-200 dark:border-white/5 divide-y divide-gray-200 dark:divide-white/10">
            {isLoading ? (
              <div className="p-5 flex justify-center text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : acceptedPolicies.length === 0 ? (
              <div className="p-5 text-sm text-gray-500">No policies accepted yet.</div>
            ) : (
              acceptedPolicies.map((acceptance: any) => (
                <div key={acceptance.id} className="flex justify-between items-center p-5">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white capitalize">
                      {acceptance.policy.type.replace(/_/g, ' ').toLowerCase()}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-zinc-400">
                      Version {acceptance.policy.version} • Accepted on {new Date(acceptance.acceptedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button className="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline">
                    View
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Data Export */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-white/10 pb-2">
            Data Export
          </h3>
          <p className="text-sm text-gray-600 dark:text-zinc-400 mb-4">
            Request an export of all your personal and workspace data in CSV/JSON format.
          </p>
          <button 
            onClick={handleExportData}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-white/20 text-sm font-medium text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isExporting ? 'Exporting...' : 'Request Data Export'}
          </button>
        </section>

      </div>
    </SettingsLayout>
  );
}
