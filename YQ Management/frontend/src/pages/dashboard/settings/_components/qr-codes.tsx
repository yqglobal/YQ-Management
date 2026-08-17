import React from 'react';
import Head from 'next/head';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../../../lib/api';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Download, ScanLine, QrCode } from 'lucide-react';
import { Button } from '../../../../components/ui/button';

export default function QRCodesSettings() {
  const { data: tenant = null, isLoading } = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => fetchApi('/tenant/me'),
  });

  if (isLoading) {
    return (
      <div className="bg-card dark:bg-dark-card rounded-[24px] border border-border dark:border-dark-border shadow-sm p-8 text-center text-outline">
        Loading...
      </div>
    );
  }

  const publicPortalUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}/public/${tenant?.subdomain}`
    : `https://qmova.com/public/${tenant?.subdomain}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-card dark:bg-dark-card rounded-[24px] border border-border dark:border-dark-border shadow-sm p-8 relative overflow-hidden mb-8">
      {/* Decorative left edge accent */}
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#f59e0b]"></div>

      <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="material-symbols-outlined text-[#f59e0b]" style={{ fontVariationSettings: "'FILL' 1" }}>qr_code_scanner</span>
            <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white tracking-tight font-semibold">QR Code Check-in</h2>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant dark:text-outline">Download or print your self-serve check-in QR code.</p>
        </div>
      </div>

      <div className="bg-surface-bright dark:bg-zinc-900 rounded-2xl border border-border dark:border-dark-border overflow-hidden flex flex-col md:flex-row shadow-sm">
        
        {/* Left Side: Info */}
        <div className="flex-1 p-8 md:p-10 border-b md:border-b-0 md:border-r border-border dark:border-dark-border flex flex-col justify-center bg-surface-container-lowest dark:bg-black/20">
          <div className="w-16 h-16 bg-[#f59e0b]/10 text-[#f59e0b] rounded-2xl flex items-center justify-center mb-6 border border-[#f59e0b]/20">
            <ScanLine strokeWidth={1.5} className="w-8 h-8" />
          </div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface dark:text-white mb-4 tracking-tight font-semibold">Self-Serve Check-In</h3>
          <p className="font-body-sm text-on-surface-variant dark:text-outline mb-8 leading-relaxed max-w-sm">
            Place this QR code at your reception, front desk, or waiting area. Customers can scan it with their phone camera to instantly access your Customer Portal. 
            <br/><br/>
            They can view live wait times, fill out intake forms, and join the queue without needing to download an app or speak to staff.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-auto">
            <button onClick={handlePrint} className="flex-1 h-[44px] flex items-center justify-center gap-2 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-lg font-body-md font-semibold transition-colors shadow-sm">
              <Printer strokeWidth={1.5} className="w-4 h-4" /> Print Flyer
            </button>
            <button className="flex-1 h-[44px] flex items-center justify-center gap-2 bg-transparent border border-border dark:border-dark-border hover:bg-surface-container-low dark:hover:bg-white/5 text-on-surface dark:text-white rounded-lg font-body-md font-semibold transition-colors">
              <Download strokeWidth={1.5} className="w-4 h-4" /> Save PNG
            </button>
          </div>
        </div>

        {/* Right Side: QR Code Display */}
        <div className="flex-1 p-8 md:p-12 flex flex-col items-center justify-center bg-white dark:bg-zinc-950">
          <div className="text-center mb-8">
            <h3 className="font-label-caps text-label-caps font-black text-on-surface dark:text-white uppercase tracking-widest">{tenant?.name || 'Your Business'}</h3>
            <p className="font-body-sm text-outline mt-1">Scan to Check-in</p>
          </div>

          <div className="p-4 bg-white rounded-2xl shadow-sm border border-border">
            <QRCodeSVG 
              value={publicPortalUrl} 
              size={240}
              level="Q"
              includeMargin={true}
              fgColor="#0F172A"
            />
          </div>

          <p className="mt-8 font-data-mono text-[12px] text-outline text-center break-all px-4 bg-surface-container-low dark:bg-white/5 py-2 rounded-lg border border-border dark:border-dark-border">
            {publicPortalUrl}
          </p>
        </div>

      </div>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .bg-surface-bright, .bg-surface-bright * { visibility: visible; }
          .bg-surface-bright { position: absolute; left: 0; top: 0; width: 100%; border: none; box-shadow: none; display: flex; flex-direction: column; }
          button { display: none !important; }
        }
      `}} />
    </div>
  );
}
