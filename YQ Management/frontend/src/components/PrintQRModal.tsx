import { getTenantUrl } from "../lib/utils";
import { useAuth } from "./AuthContext";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Check, QrCode, Layers } from 'lucide-react';
import { toast } from 'sonner';

interface Queue {
  id: string;
  name: string;
  status: string;
  [key: string]: any;
}

interface PrintQRModalProps {
  open: boolean;
  onClose: () => void;
  queues: Queue[];
}

export default function PrintQRModal({ open, onClose, queues }: PrintQRModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [baseUrl, setBaseUrl] = useState(typeof window !== 'undefined' ? window.location.origin : '');

  const { user } = useAuth();
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const subdomain = user?.tenant?.subdomain || '';
      const url = getTenantUrl(subdomain);
      setBaseUrl(url || window.location.origin);
    }
  }, [user?.tenant?.subdomain]);

  useEffect(() => {
    if (open && queues.length > 0) {
      // Pre-select all active queues by default, or all queues if none are active
      const activeIds = queues.filter(q => q.status === 'ACTIVE').map(q => q.id);
      if (activeIds.length > 0) {
        setSelectedIds(new Set(activeIds));
      } else {
        setSelectedIds(new Set(queues.map(q => q.id)));
      }
    }
  }, [open, queues]);

  const toggleQueue = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === queues.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(queues.map(q => q.id)));
    }
  };

  const handlePrint = () => {
    const idsToPrint = Array.from(selectedIds);
    if (idsToPrint.length === 0) {
      toast.error('Please select at least one queue to print.');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
      toast.error('Popup blocked! Please allow popups for printing.');
      return;
    }

    const queuesToPrint = queues.filter(q => idsToPrint.includes(q.id));

    const pagesHtml = queuesToPrint.map(queue => {
      const joinUrl = `${baseUrl}/booking?queueId=${queue.id}`;
      // Grab clean rendered SVG vector code or fallback to API image
      const svgEl = document.getElementById(`qr-svg-render-${queue.id}`);
      const qrContent = svgEl ? svgEl.innerHTML : `<img src="https://api.qrserver.com/v1/create-qr-code/?size=380x380&data=${encodeURIComponent(joinUrl)}" alt="QR Code" />`;

      return `
        <div class="page-container">
          <h1 class="queue-title">${queue.name}</h1>
          <div class="qr-box">
            ${qrContent}
          </div>
          <div class="cta-text">SCAN TO JOIN QUEUE</div>
          <div class="url-text">${joinUrl}</div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Queue QR Codes - Qmova</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 1.5cm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #000000 !important;
              background: #ffffff !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              text-align: center;
            }
            .page-container {
              width: 100%;
              min-height: 92vh;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              padding: 40px 20px;
              page-break-after: always;
              break-after: page;
            }
            .page-container:last-child {
              page-break-after: auto;
              break-after: auto;
            }
            .queue-title {
              font-size: 40px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              color: #000000;
              margin-bottom: 50px;
              max-width: 90%;
              line-height: 1.25;
            }
            .qr-box {
              padding: 24px;
              border: 4px solid #000000;
              border-radius: 20px;
              background: #ffffff;
              display: inline-flex;
              justify-content: center;
              align-items: center;
              margin-bottom: 50px;
            }
            .qr-box svg, .qr-box img {
              width: 360px;
              height: 360px;
              display: block;
            }
            .cta-text {
              font-size: 32px;
              font-weight: 900;
              letter-spacing: 2px;
              text-transform: uppercase;
              color: #000000;
              margin-bottom: 16px;
            }
            .url-text {
              font-size: 15px;
              font-family: monospace;
              color: #444444;
              letter-spacing: 0.5px;
            }
            @media print {
              body {
                color: #000 !important;
                background: #fff !important;
              }
              .page-container {
                min-height: 92vh;
                break-after: page;
                page-break-after: always;
              }
              .page-container:last-child {
                break-after: auto;
                page-break-after: auto;
              }
            }
          </style>
        </head>
        <body>
          ${pagesHtml}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    // Give browser renderer 300ms to parse SVG DOM before opening system print dialog
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
      onClose();
    }, 300);
  };

  if (!open) return null;

  const isAllSelected = queues.length > 0 && selectedIds.size === queues.length;

  return createPortal(
    <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 dark: animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Hidden Container for Vector SVG Generation */}
        <div className="hidden aria-hidden">
          {queues.map(q => (
            <div key={q.id} id={`qr-svg-render-${q.id}`}>
              <QRCodeSVG value={`${baseUrl}/booking?queueId=${q.id}`} size={360} level="H" />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Print Queue QR Codes</h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400">Select queues to print B&W printable signage pages.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200/50 dark:hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
          </button>
        </div>

        {/* Controls Header */}
        <div className="p-4 border-b border-gray-200 dark:border-white/10 bg-gray-100/50 dark:bg-black/20 flex items-center justify-between px-6">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded border-gray-300 dark:border-zinc-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-sm font-semibold text-gray-800 dark:text-zinc-200">
              {isAllSelected ? 'Deselect All Queues' : 'Select All Queues'}
            </span>
          </label>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-500/20">
            {selectedIds.size} of {queues.length} selected
          </span>
        </div>

        {/* Queues Checkbox List */}
        <div className="flex-1 overflow-y-auto p-6 divide-y divide-gray-100 dark:divide-white/5 space-y-3">
          {queues.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-zinc-500">
              <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No queues available in this workspace yet.</p>
            </div>
          ) : (
            queues.map(queue => {
              const isChecked = selectedIds.has(queue.id);
              return (
                <div
                  key={queue.id}
                  onClick={() => toggleQueue(queue.id)}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all select-none ${
                    isChecked
                      ? 'border-indigo-500/80 bg-indigo-50/50 dark:bg-indigo-500/10 shadow-sm'
                      : 'border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800/40 hover:border-gray-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // Handled by div wrapper onClick
                      className="w-4 h-4 rounded border-gray-300 dark:border-zinc-600 text-indigo-600 focus:ring-indigo-500 pointer-events-none"
                    />
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 dark:text-white truncate">{queue.name}</p>
                        <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border ${
                          queue.status === 'ACTIVE' 
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' 
                            : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                        }`}>
                          {queue.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 font-mono mt-0.5 truncate">
                        {baseUrl ? `${baseUrl}/booking?queueId=${queue.id}` : `/booking?queueId=${queue.id}`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="pl-3 flex shrink-0 text-xs font-bold text-gray-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Printer className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
                      1 page
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-zinc-800/50">
          <div className="text-xs font-medium text-gray-500 dark:text-zinc-400">
            Prints in high-contrast B&W using system print dialog.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-zinc-700 rounded-xl transition-colors shadow-sm"
            >
              Cancel
            </button>
            <button
              onClick={handlePrint}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] border border-indigo-500/50 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <Printer className="w-4 h-4" />
              Print {selectedIds.size > 0 ? `${selectedIds.size} QR${selectedIds.size === 1 ? '' : 's'}` : 'Selected QRs'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
