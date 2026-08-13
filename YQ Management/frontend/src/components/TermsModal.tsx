import React, { useState, useRef, useEffect } from 'react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  type: 'terms' | 'privacy';
}

export default function TermsModal({ isOpen, onClose, onAccept, type }: TermsModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setHasScrolledToBottom(false);
    }
  }, [isOpen]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    
    // Check if user has scrolled near the bottom (within 20px)
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-md z-[120] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-zinc-950">
          <h2 className="text-xl font-semibold text-white">
            {type === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">✕</button>
        </div>
        
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="p-6 overflow-y-auto flex-1 text-sm text-zinc-400 space-y-6"
        >
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-300 mb-6">
            Please read through the entire document. You must scroll to the bottom to accept.
          </div>
          
          <h3 className="text-lg font-medium text-white">1. Introduction</h3>
          <p>
            Welcome to Qmova. This is a placeholder for the actual {type === 'terms' ? 'Terms of Service' : 'Privacy Policy'}. 
            When deploying to production, this content must be replaced with the legally binding text approved by your legal counsel.
          </p>

          <h3 className="text-lg font-medium text-white">2. Placeholder Content</h3>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla vitae elit libero, a pharetra augue. 
            Aenean eu leo quam. Pellentesque ornare sem lacinia quam venenatis vestibulum. Sed posuere consectetur 
            est at lobortis. Donec ullamcorper nulla non metus auctor fringilla.
          </p>
          <p>
            Curabitur blandit tempus porttitor. Nullam quis risus eget urna mollis ornare vel eu leo. 
            Donec id elit non mi porta gravida at eget metus. Maecenas faucibus mollis interdum.
          </p>

          {/* Add vertical height to force scrolling */}
          <div className="h-96 border-l-4 border-white/5 pl-4 flex items-center text-zinc-600">
            [Long legal text continues...]
          </div>

          <h3 className="text-lg font-medium text-white">3. Agreement</h3>
          <p>
            By accepting, you agree to these terms in full.
          </p>
        </div>
        
        <div className="p-6 border-t border-white/10 flex items-center justify-between bg-zinc-950">
          <span className="text-sm text-zinc-500">
            {!hasScrolledToBottom ? 'Please scroll to the bottom to accept.' : 'You have reached the end.'}
          </span>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-white/20 text-sm font-medium text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button 
              disabled={!hasScrolledToBottom}
              onClick={() => {
                onAccept();
                onClose();
              }}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              I have read this document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
