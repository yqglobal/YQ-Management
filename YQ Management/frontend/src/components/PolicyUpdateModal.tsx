import React, { useState } from 'react';
import TermsModal from './TermsModal';
import { fetchApi } from '../lib/api';

interface PolicyUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  policyType: 'terms' | 'privacy';
  version: string;
}

export default function PolicyUpdateModal({ isOpen, onClose, policyType, version }: PolicyUpdateModalProps) {
  const [showDocument, setShowDocument] = useState(false);
  
  if (!isOpen && !showDocument) return null;

  return (
    <>
      {isOpen && !showDocument && (
        <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-white/10 text-center">
              <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Policy Update Required</h2>
              <p className="text-sm text-zinc-400">
                We have updated our {policyType === 'terms' ? 'Terms of Service' : 'Privacy Policy'} to version {version}. 
                You must review and accept the new terms to continue using Qmova.
              </p>
            </div>
            <div className="p-6 bg-zinc-950 flex flex-col gap-3">
              <button 
                onClick={() => setShowDocument(true)}
                className="w-full py-3 px-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-500 transition-colors"
              >
                Review Document
              </button>
            </div>
          </div>
        </div>
      )}

      {showDocument && (
        <TermsModal 
          isOpen={showDocument}
          onClose={() => {
            setShowDocument(false);
            // Optionally, you might not allow them to close without accepting in a real app,
            // or you log them out. For now, it just goes back to the prompt.
          }}
          type={policyType}
          onAccept={async () => {
            try {
              const apiType = policyType === 'terms' ? 'TERMS_OF_SERVICE' : 'PRIVACY_POLICY';
              await fetchApi('/policies/accept', {
                method: 'POST',
                body: JSON.stringify({ type: apiType, version })
              });
            } catch (err) {
              console.error('Failed to accept policy', err);
            }
            setShowDocument(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
