import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
    functional: false,
    marketing: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem('qmova_cookie_consent');
    if (!consent) {
      setShowBanner(true);
    } else {
      setPreferences(JSON.parse(consent));
    }
  }, []);

  const handleAcceptAll = () => {
    const prefs = { necessary: true, analytics: true, functional: true, marketing: true };
    saveConsent(prefs);
  };

  const handleRejectNonEssential = () => {
    const prefs = { necessary: true, analytics: false, functional: false, marketing: false };
    saveConsent(prefs);
  };

  const handleSavePreferences = () => {
    saveConsent(preferences);
  };

  const saveConsent = async (prefs: any) => {
    localStorage.setItem('qmova_cookie_consent', JSON.stringify(prefs));
    setPreferences(prefs);
    setShowBanner(false);
    setShowModal(false);
    
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
          preferences: prefs
        })
      });
    } catch (err) {
      console.error('Failed to save cookie preferences', err);
    }
  };

  if (!showBanner && !showModal) return null;

  return (
    <>
      {/* Banner */}
      {showBanner && !showModal && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-zinc-900 border-t border-white/10 shadow-2xl p-4 md:p-6 text-zinc-300 animate-in slide-in-from-bottom">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-2">We respect your privacy</h3>
              <p className="text-sm leading-relaxed max-w-3xl">
                We use cookies and similar technologies to enhance your experience, analyze our traffic, and for security purposes. 
                By clicking "Accept All", you consent to the use of all cookies. You can customize your settings by clicking "Manage Preferences". 
                For more details, read our <a href="/cookies" className="text-indigo-400 hover:underline">Cookie Policy</a>.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button 
                onClick={() => setShowModal(true)}
                className="px-4 py-2 rounded-lg border border-white/20 text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Manage Preferences
              </button>
              <button 
                onClick={handleRejectNonEssential}
                className="px-4 py-2 rounded-lg border border-white/20 text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Reject Non-Essential
              </button>
              <button 
                onClick={handleAcceptAll}
                className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Cookie Preferences</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
              <p className="text-sm text-zinc-400">
                Manage how we use cookies on your device. Necessary cookies cannot be disabled as they are required for the site to function properly.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-zinc-800/50 border border-white/5">
                  <div className="mt-1">
                    <input type="checkbox" checked disabled className="w-4 h-4 rounded border-zinc-600 bg-indigo-600 focus:ring-indigo-600" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Strictly Necessary</h4>
                    <p className="text-sm text-zinc-400">Required for the website to function, such as securing your connection and remembering your privacy preferences.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-zinc-800/50 border border-white/5">
                  <div className="mt-1">
                    <input 
                      type="checkbox" 
                      checked={preferences.analytics}
                      onChange={(e) => setPreferences({...preferences, analytics: e.target.checked})}
                      className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 focus:ring-indigo-600 accent-indigo-600" 
                    />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Analytics</h4>
                    <p className="text-sm text-zinc-400">Help us understand how visitors interact with the website by collecting and reporting information anonymously.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-zinc-800/50 border border-white/5">
                  <div className="mt-1">
                    <input 
                      type="checkbox" 
                      checked={preferences.functional}
                      onChange={(e) => setPreferences({...preferences, functional: e.target.checked})}
                      className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 focus:ring-indigo-600 accent-indigo-600" 
                    />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Functional</h4>
                    <p className="text-sm text-zinc-400">Enable the website to provide enhanced functionality and personalization.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 rounded-xl bg-zinc-800/50 border border-white/5">
                  <div className="mt-1">
                    <input 
                      type="checkbox" 
                      checked={preferences.marketing}
                      onChange={(e) => setPreferences({...preferences, marketing: e.target.checked})}
                      className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 focus:ring-indigo-600 accent-indigo-600" 
                    />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Marketing</h4>
                    <p className="text-sm text-zinc-400">Used to track visitors across websites to display relevant and engaging advertisements.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-white/10 flex items-center justify-end gap-3 bg-zinc-950/50">
              <button 
                onClick={handleRejectNonEssential}
                className="px-5 py-2.5 rounded-lg border border-white/20 text-sm font-medium text-white hover:bg-white/5 transition-colors"
              >
                Reject Non-Essential
              </button>
              <button 
                onClick={handleSavePreferences}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
