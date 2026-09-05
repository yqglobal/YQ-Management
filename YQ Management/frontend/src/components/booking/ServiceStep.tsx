import React from 'react';
import { motion } from 'framer-motion';
import { Layers } from 'lucide-react';

interface ServiceStepProps {
  services: any[];
  tenant: any;
  selectedLocationId: string | null;
  selectedServiceIds: string[];
  toggleService: (serviceId: string) => void;
  onNext: (e: React.FormEvent) => void;
  errorMsg: string;
  primaryColor: string;
  supportNumber: string;
}

export const ServiceStep: React.FC<ServiceStepProps> = ({
  services,
  tenant,
  selectedLocationId,
  selectedServiceIds,
  toggleService,
  onNext,
  errorMsg,
  primaryColor,
  supportNumber,
}) => {
  const filteredServices = services.filter((s: any) => !s.locationId || s.locationId === selectedLocationId);

  return (
    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 flex-1">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-extrabold tracking-tight mb-2">What do you need help with?</h2>
        <p className="text-gray-500 dark:text-gray-400">Select one or more services</p>
      </div>

      <form onSubmit={onNext} className="space-y-6">
        <div className="space-y-3">
          {filteredServices.length === 0 ? (
            <div className="p-6 text-center text-gray-500 border-2 border-dashed rounded-xl dark:border-zinc-800">
              <p>No services available at this location right now.</p>
              {supportNumber && (
                <p className="mt-2 text-sm">Please contact support at <a href={`tel:${supportNumber}`} className="font-bold underline">{supportNumber}</a></p>
              )}
            </div>
          ) : (
            filteredServices.map((service: any) => {
              const isSelected = selectedServiceIds.includes(service.id);
              return (
                <label key={service.id} className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-transparent shadow-md' : 'border-gray-200 dark:border-zinc-800'}`} style={isSelected ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10` } : {}}>
                  <div className="mt-1">
                    <input 
                      type="checkbox" 
                      checked={isSelected} 
                      onChange={() => toggleService(service.id)}
                      className="w-5 h-5 rounded" style={{ accentColor: primaryColor }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base">{service.name}</h3>
                      {service.expectedDuration && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-md bg-white dark:bg-zinc-900 shadow-sm border dark:border-zinc-800 text-gray-600 dark:text-gray-300">
                          ~{service.expectedDuration} min
                        </span>
                      )}
                    </div>
                    {service.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{service.description}</p>
                    )}
                  </div>
                </label>
              );
            })
          )}
        </div>
        {errorMsg && <p className="text-red-500 text-sm font-medium text-center bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">{errorMsg}</p>}
        <button type="submit" disabled={selectedServiceIds.length === 0} className="w-full py-4 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: primaryColor }}>
          Continue {selectedServiceIds.length > 0 && `(${selectedServiceIds.length})`}
        </button>
      </form>
    </motion.div>
  );
};
