import React from 'react';
import { motion } from 'framer-motion';

interface ServiceStepProps {
  services: AnyFixMe[];
  tenant: AnyFixMe;
  selectedLocationId: string | null;
  selectedServiceIds: string[];
  toggleService: (serviceId: string) => void;
  onNext: (e: React.FormEvent) => void;
  errorMsg: string;
  primaryColor: string;
  onViewTickets?: () => void;
}

const getCurrencySymbol = (curr?: string): string => {
  const c = (curr || 'ZAR').toUpperCase();
  if (c === 'ZAR') return 'R';
  if (c === 'EUR') return '€';
  if (c === 'GBP') return '£';
  if (c === 'JPY') return '¥';
  return '$';
};

export const ServiceStep: React.FC<ServiceStepProps> = ({
  services,
  tenant,
  selectedLocationId,
  selectedServiceIds,
  toggleService,
  onNext,
  errorMsg,
  primaryColor,
  onViewTickets,
}) => {
  const filteredServices = services.filter((s: AnyFixMe) => !s.locationId || s.locationId === selectedLocationId);

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
            </div>
          ) : (
            filteredServices.map((service: AnyFixMe) => {
              const isSelected = selectedServiceIds.includes(service.id);
              const price = typeof service.basePrice === 'number' ? service.basePrice : service.basePrice ? parseFloat(service.basePrice) : 0;
              const currency = service.priceCurrency || service.currency || tenant?.currency || 'ZAR';
              const currSymbol = getCurrencySymbol(currency);

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
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-gray-900 dark:text-white">{service.name}</h3>
                        {price > 0 ? (
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-mono shadow-sm">
                            {currSymbol}{(price / 100).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400">
                            Free
                          </span>
                        )}
                      </div>
                      {service.expectedDuration && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-md bg-white dark:bg-zinc-900 shadow-sm border border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-300 shrink-0">
                          ~{service.expectedDuration} min
                        </span>
                      )}
                    </div>
                    {service.description && service.description !== 'Created during setup' && (
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
        {onViewTickets && (
          <button 
            type="button" 
            onClick={onViewTickets}
            className="w-full py-4 rounded-xl font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-zinc-800 transition-colors hover:bg-gray-200 dark:hover:bg-zinc-700"
          >
            Find My Tickets
          </button>
        )}
      </form>
    </motion.div>
  );
};
