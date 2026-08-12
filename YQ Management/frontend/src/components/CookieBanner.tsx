import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('qmova_cookie_consent');
    if (!consent) {
      setShow(true);
    }
  }, []);

  const handleConsent = async (acceptAll: boolean) => {
    const preferences = {
      necessary: true,
      analytics: acceptAll,
      functional: acceptAll,
      marketing: acceptAll
    };
    
    // Save to local storage
    localStorage.setItem('qmova_cookie_consent', JSON.stringify(preferences));
    setShow(false);

    // Save to backend
    let anonymousId = localStorage.getItem('qmova_anonymous_id');
    if (!anonymousId) {
      anonymousId = crypto.randomUUID();
      localStorage.setItem('qmova_anonymous_id', anonymousId);
    }

    try {
      await fetchApi('/policies/cookie-preferences', {
        method: 'POST',
        body: JSON.stringify({
          anonymousId,
          preferences
        })
      });
    } catch (err) {
      console.error('Failed to save cookie preferences', err);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-[999] pointer-events-none flex justify-center">
      <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl shadow-2xl pointer-events-auto max-w-4xl w-full flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-bottom-10">
        <div className="flex-1">
          <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
            🍪 We value your privacy
          </h3>
          <p className="text-zinc-400 text-sm">
            We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies as outlined in our <a href="/docs/legal/privacy-policy" className="text-indigo-400 hover:underline">Privacy Policy</a>.
          </p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <button 
            onClick={() => handleConsent(false)}
            className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 font-medium transition-colors text-sm"
          >
            Essential Only
          </button>
          <button 
            onClick={() => handleConsent(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 font-medium transition-colors text-sm"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
