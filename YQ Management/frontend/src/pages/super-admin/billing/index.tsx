import React from 'react';
import Head from 'next/head';
import SuperAdminLayout from '../../../components/SuperAdminLayout';
import { fetchApi } from '../../../lib/api';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function SuperAdminBilling() {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['super-admin-transactions'],
    queryFn: () => fetchApi('/super-admin/transactions')
  });

  return (
    <SuperAdminLayout pageTitle="Billing" pageSubtitle="Manage subscriptions and billing">
      <Head>
        <title>Revenue & Transactions | Super Admin</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase">Revenue &amp; Transactions</h1>
          <p className="text-gray-500 dark:text-zinc-400 mt-2">Monitor Ozow payments and global revenue.</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              Recent Transactions
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-zinc-400">
              <thead className="bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-zinc-200 font-bold uppercase tracking-wider text-xs border-b border-gray-200 dark:border-white/10">
                <tr>
                  <th className="px-6 py-4">Transaction Ref</th>
                  <th className="px-6 py-4">Tenant</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-zinc-500">
                      Loading transactions...
                    </td>
                  </tr>
                ) : transactions?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-zinc-500">
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  transactions?.map((tx: AnyFixMe) => (
                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-mono text-xs font-medium text-gray-900 dark:text-zinc-200">{tx.transactionRef}</div>
                        {tx.ozowPayRequestId && (
                          <div className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">Ozow: {tx.ozowPayRequestId}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                        {tx.tenant?.name || 'Unknown Tenant'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900 dark:text-white">
                        {tx.currency} {tx.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                          tx.status === 'COMPLETE' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                            : tx.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                            : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                        }`}>
                          {tx.status === 'COMPLETE' && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {tx.status === 'PENDING' && <Clock className="w-3.5 h-3.5" />}
                          {(tx.status === 'CANCELLED' || tx.status === 'ERROR') && <XCircle className="w-3.5 h-3.5" />}
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-zinc-400">
                        <div className="font-medium text-gray-900 dark:text-zinc-200">{tx.createdAt ? format(new Date(tx.createdAt), 'MMM d, yyyy') : '-'}</div>
                        <div className="text-xs">{tx.createdAt ? format(new Date(tx.createdAt), 'h:mm a') : '-'}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
