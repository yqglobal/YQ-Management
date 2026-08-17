import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Search, Clock, FileText, Settings, Users, MonitorSmartphone, X } from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Handle ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const quickLinks = [
    { label: 'Service Desk', href: '/dashboard', icon: <MonitorSmartphone className="w-5 h-5 text-primary" />, category: 'Navigation' },
    { label: 'Waitlist Queues', href: '/dashboard/queues', icon: <Clock className="w-5 h-5 text-amber-500" />, category: 'Navigation' },
    { label: 'Workspace Settings', href: '/dashboard/settings/workspace', icon: <Settings className="w-5 h-5 text-slate-500" />, category: 'Settings' },
    { label: 'Team & Security', href: '/dashboard/settings/team', icon: <Users className="w-5 h-5 text-indigo-500" />, category: 'Settings' },
    { label: 'Billing & Usage', href: '/dashboard/settings/billing', icon: <FileText className="w-5 h-5 text-emerald-500" />, category: 'Settings' },
    { label: 'Audit Logs', href: '/dashboard/settings/security', icon: <FileText className="w-5 h-5 text-rose-500" />, category: 'Settings' },
  ];

  const filteredLinks = query 
    ? quickLinks.filter(l => l.label.toLowerCase().includes(query.toLowerCase()) || l.category.toLowerCase().includes(query.toLowerCase()))
    : quickLinks;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4 sm:px-0">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-surface dark:bg-dark-card w-full max-w-2xl rounded-2xl border border-border dark:border-dark-border shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center px-4 border-b border-border dark:border-dark-border">
          <Search className="w-6 h-6 text-on-surface-variant dark:text-outline" />
          <input
            ref={inputRef}
            type="text"
            className="w-full h-16 bg-transparent border-none focus:ring-0 text-headline-sm text-on-surface dark:text-white px-4 outline-none font-body-lg"
            placeholder="Search Qmova (Press ESC to close)..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button onClick={onClose} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredLinks.length > 0 ? (
            <div className="space-y-1">
              <h3 className="px-4 py-2 font-label-caps text-label-caps text-on-surface-variant dark:text-outline uppercase tracking-wider">Quick Actions</h3>
              {filteredLinks.map((link, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    router.push(link.href);
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3 hover:bg-surface-container-low dark:hover:bg-white/5 rounded-xl transition-colors text-left group"
                >
                  <div className="bg-surface-container dark:bg-black/50 p-2 rounded-lg border border-border dark:border-dark-border group-hover:border-primary/30 transition-colors">
                    {link.icon}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-body-md text-on-surface dark:text-white">{link.label}</span>
                    <span className="text-body-sm text-on-surface-variant dark:text-outline">{link.category}</span>
                  </div>
                  <span className="material-symbols-outlined ml-auto text-outline opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-on-surface-variant dark:text-outline">
              <p className="font-body-md text-body-md">No results found for "{query}".</p>
            </div>
          )}
        </div>
        
        <div className="px-4 py-3 bg-surface-container-lowest dark:bg-black/20 border-t border-border dark:border-dark-border text-center flex items-center justify-between text-on-surface-variant dark:text-outline font-body-sm">
           <span>Search anything across your workspace</span>
           <span className="font-data-mono bg-surface-container px-2 py-0.5 rounded text-[10px]">v1.0</span>
        </div>
      </div>
    </div>
  );
}
