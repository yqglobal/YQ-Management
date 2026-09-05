import React from 'react';
import { motion } from 'framer-motion';

interface LocationStepProps {
  tenant: any;
  selectedLocationId: string | null;
  setSelectedLocationId: (id: string) => void;
  onNext: (e: React.FormEvent) => void;
  errorMsg: string;
  primaryColor: string;
}

export const LocationStep: React.FC<LocationStepProps> = ({
  tenant,
  selectedLocationId,
  setSelectedLocationId,
  onNext,
  errorMsg,
  primaryColor,
}) => {
  return (
    <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 flex-1">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight mb-2">Welcome to {tenant.name}</h1>
        <p className="text-gray-500 dark:text-gray-400">Select a Location</p>
      </div>

      <form onSubmit={onNext} className="space-y-6">
        <div className="space-y-3">
          {tenant?.locations?.map((loc: any) => (
            <label key={loc.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedLocationId === loc.id ? 'border-transparent shadow-md' : 'border-gray-200 dark:border-zinc-800'}`} style={selectedLocationId === loc.id ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10` } : {}}>
              <input 
                type="radio" 
                name="location"
                checked={selectedLocationId === loc.id} 
                onChange={() => setSelectedLocationId(loc.id)}
                className="w-5 h-5" style={{ accentColor: primaryColor }}
              />
              <div className="flex-1">
                <h3 className="font-bold text-base">{loc.name}</h3>
                {(loc.address || loc.city) && <p className="text-sm text-gray-500 mt-1">{[loc.address, loc.city].filter(Boolean).join(', ')}</p>}
              </div>
            </label>
          ))}
        </div>
        {errorMsg && <p className="text-red-500 text-sm font-medium text-center bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">{errorMsg}</p>}
        <button type="submit" disabled={!selectedLocationId} className="w-full py-4 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50" style={{ backgroundColor: primaryColor }}>
          Continue
        </button>
      </form>
    </motion.div>
  );
};
