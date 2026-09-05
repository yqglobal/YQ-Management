import React from 'react';
import { motion } from 'framer-motion';
import PhoneInput from 'react-phone-number-input';

interface ContactStepProps {
  name: string;
  setName: (name: string) => void;
  phone: string;
  setPhone: (phone: string) => void;
  defaultCountry: any;
  errorMsg: string;
  primaryColor: string;
  onNext: (e: React.FormEvent) => void;
  onBack: () => void;
}

export const ContactStep: React.FC<ContactStepProps> = ({
  name, setName, phone, setPhone, defaultCountry, errorMsg, primaryColor, onNext, onBack
}) => {
  return (
    <motion.div key="step35" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 flex-1">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-extrabold tracking-tight mb-2">Your Details</h2>
        <p className="text-gray-500 dark:text-gray-400">Who is this booking for?</p>
      </div>

      <form onSubmit={onNext} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300 uppercase tracking-wider">Your Name <span className="text-red-500">*</span></label>
            <input 
              type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" required
              className="w-full p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 transition-shadow focus:border-transparent"
              style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">WhatsApp Number <span className="text-red-500">*</span></label>
            <PhoneInput international defaultCountry={defaultCountry} value={phone} onChange={(v: any) => setPhone(v)} className="PhoneInput" />
            <p className="text-xs text-gray-500 mt-2">Required for your tickets and live updates.</p>
          </div>
        </div>

        {errorMsg && <p className="text-red-500 text-sm font-medium text-center bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">{errorMsg}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={onBack} className="w-1/3 py-4 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors">
            Back
          </button>
          <button type="submit" className="flex-1 py-4 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95" style={{ backgroundColor: primaryColor }}>
            Continue
          </button>
        </div>
      </form>
    </motion.div>
  );
};
