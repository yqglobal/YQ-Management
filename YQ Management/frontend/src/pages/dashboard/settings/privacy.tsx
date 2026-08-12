import React from 'react';
import SettingsLayout from '../../../components/SettingsLayout';

export default function PrivacySettings() {
  return (
    <SettingsLayout pageTitle="Privacy Dashboard" pageSubtitle="Manage your data and consent">
      <div className="p-6 md:p-8 max-w-4xl space-y-12">
        
        {/* Consent Section */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-white/10 pb-2">
            Accepted Policies
          </h3>
          <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-5 border border-gray-200 dark:border-white/5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Terms of Service</h4>
                <p className="text-sm text-gray-500 dark:text-zinc-400">Accepted on Aug 12, 2026</p>
              </div>
              <button className="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline">View</button>
            </div>
            <hr className="border-gray-200 dark:border-white/10" />
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Privacy Policy</h4>
                <p className="text-sm text-gray-500 dark:text-zinc-400">Accepted on Aug 12, 2026</p>
              </div>
              <button className="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline">View</button>
            </div>
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
          <button className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/20 text-sm font-medium text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
            Request Data Export
          </button>
        </section>

      </div>
    </SettingsLayout>
  );
}
