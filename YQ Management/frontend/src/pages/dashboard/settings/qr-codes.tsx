import React from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../../lib/api';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Download, ScanLine } from 'lucide-react';
import { Button } from '../../../components/ui/button';

export default function QRCodesSettings() {
  const { data: tenant = null, isLoading } = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => fetchApi('/tenant/me'),
  });

  if (isLoading) {
    return (
      <SettingsLayout pageTitle="QR Codes & Kiosk" pageSubtitle="Loading your QR codes...">
        <div className="p-8 text-center text-gray-500">Loading...</div>
      </SettingsLayout>
    );
  }

  const publicPortalUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}/public/${tenant?.subdomain}`
    : `https://qmova.com/public/${tenant?.subdomain}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <SettingsLayout pageTitle="QR Codes & Kiosk" pageSubtitle="Download and print QR codes for your physical locations.">
      <Head>
        <title>QR Codes | Qmova</title>
      </Head>

      <div className="p-8">
        <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col md:flex-row">
          
          {/* Left Side: Info */}
          <div className="flex-1 p-8 md:p-12 border-b md:border-b-0 md:border-r border-gray-200 dark:border-white/10 flex flex-col justify-center bg-gray-50 dark:bg-black/20">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6">
              <ScanLine className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Self-Serve Check-In</h2>
            <p className="text-gray-600 dark:text-zinc-400 mb-8 leading-relaxed">
              Place this QR code at your reception, front desk, or waiting area. Customers can scan it with their phone camera to instantly access your Customer Portal. 
              <br/><br/>
              They can view live wait times, fill out intake forms, and join the queue without needing to download an app or speak to staff.
            </p>
            
            <div className="flex gap-4 mt-auto">
              <Button onClick={handlePrint} className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors shadow-lg">
                <Printer className="w-4 h-4" /> Print Flyer
              </Button>
              <Button variant="outline" className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium">
                <Download className="w-4 h-4" /> Save PNG
              </Button>
            </div>
          </div>

          {/* Right Side: QR Code Display */}
          <div className="flex-1 p-8 md:p-12 flex flex-col items-center justify-center bg-white dark:bg-zinc-900">
            <div className="text-center mb-8">
              <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-widest">{tenant?.name || 'Your Business'}</h3>
              <p className="text-gray-500 dark:text-zinc-500 mt-1">Scan to Check-in</p>
            </div>

            <div className="p-4 bg-white rounded-2xl shadow-xl border border-gray-100">
              <QRCodeSVG 
                value={publicPortalUrl} 
                size={256}
                level="Q"
                includeMargin={true}
                fgColor="#0F172A"
              />
            </div>

            <p className="mt-8 text-sm font-mono text-gray-400 dark:text-zinc-600 text-center break-all px-4">
              {publicPortalUrl}
            </p>
          </div>

        </div>

        {/* Print Styles */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * { visibility: hidden; }
            .max-w-4xl, .max-w-4xl * { visibility: visible; }
            .max-w-4xl { position: absolute; left: 0; top: 0; width: 100%; border: none; box-shadow: none; }
            button { display: none !important; }
          }
        `}} />
      </div>
    </SettingsLayout>
  );
}
