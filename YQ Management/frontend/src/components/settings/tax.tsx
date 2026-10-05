import React, { useState, useEffect } from 'react';
import { Save, Loader2, Building2, Receipt } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';

const REGIMES = [
  { country: 'IN', label: 'India (GST)' },
  { country: 'ZA', label: 'South Africa (VAT)' },
  { country: 'US', label: 'United States (Sales Tax)' },
  { country: 'GB', label: 'United Kingdom (VAT)' },
  { country: 'OTHER', label: 'Other / Custom' },
];

export default function TaxSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const [form, setForm] = useState({
    country: 'IN',
    taxRegime: 'GST',
    businessLegalName: '',
    taxNumber: '', // GSTIN, VAT No, etc.
    defaultTaxRatePercent: '18',
    taxInclusive: false,
    invoicePrefix: 'INV',
  });

  useEffect(() => {
    const loadTenant = async () => {
      try {
        const data = await fetchApi('/tenant/me');
        setTenantId(data.id);
        if (data.taxConfig) {
          setForm((prev) => ({
            ...prev,
            country: data.taxConfig.country || 'IN',
            taxRegime: data.taxConfig.taxRegime || 'GST',
            businessLegalName: data.taxConfig.businessLegalName || '',
            taxNumber: data.taxConfig.taxNumber || '',
            defaultTaxRatePercent: data.taxConfig.defaultTaxRatePercent?.toString() || '18',
            taxInclusive: data.taxConfig.taxInclusive || false,
          }));
        }
        if (data.invoicePrefix) {
          setForm((prev) => ({ ...prev, invoicePrefix: data.invoicePrefix }));
        }
      } catch (err) {
        console.error('Failed to load tenant', err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.tenantId) {
      loadTenant();
    }
  }, [user]);

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const taxConfig = {
        country: form.country,
        taxRegime: form.taxRegime,
        businessLegalName: form.businessLegalName,
        taxNumber: form.taxNumber,
        defaultTaxRatePercent: parseFloat(form.defaultTaxRatePercent) || 0,
        taxInclusive: form.taxInclusive,
      };

      await fetchApi(`/tenant/${tenantId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          taxConfig,
          invoicePrefix: form.invoicePrefix,
        }),
      });
      toast.success('Tax & Invoicing settings saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save tax settings');
    } finally {
      setSaving(false);
    }
  };

  const updateCountry = (country: string) => {
    const regimeMap: Record<string, { regime: string; rate: string }> = {
      IN: { regime: 'GST', rate: '18' },
      ZA: { regime: 'VAT', rate: '15' },
      US: { regime: 'Sales Tax', rate: '8' },
      GB: { regime: 'VAT', rate: '20' },
      OTHER: { regime: 'Tax', rate: '0' },
    };
    const preset = regimeMap[country] || regimeMap['OTHER'];
    setForm((prev) => ({
      ...prev,
      country,
      taxRegime: preset.regime,
      defaultTaxRatePercent: preset.rate,
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48 bg-card dark:bg-dark-card rounded-[24px] border border-border dark:border-dark-border">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-card dark:bg-dark-card rounded-[24px] border border-border dark:border-dark-border shadow-sm p-8 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-indigo-500"></div>

        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Building2 className="w-6 h-6 text-indigo-500" />
              <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white font-semibold">Tax Compliance</h2>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant dark:text-outline">
              Configure your business legal details and regional tax settings.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">
              Country & Tax Regime
            </label>
            <select
              value={form.country}
              onChange={(e) => updateCountry(e.target.value)}
              className="w-full h-[44px] bg-white dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg px-4 font-body-md text-body-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow text-on-surface dark:text-white"
            >
              {REGIMES.map((r) => (
                <option key={r.country} value={r.country}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">
              Business Legal Name
            </label>
            <input
              type="text"
              value={form.businessLegalName}
              onChange={(e) => setForm({ ...form, businessLegalName: e.target.value })}
              className="w-full h-[44px] bg-white dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg px-4 font-body-md text-body-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow text-on-surface dark:text-white"
              placeholder="e.g. Acme Corp Ltd."
            />
          </div>

          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">
              Tax Registration Number ({form.taxRegime})
            </label>
            <input
              type="text"
              value={form.taxNumber}
              onChange={(e) => setForm({ ...form, taxNumber: e.target.value })}
              className="w-full h-[44px] bg-white dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg px-4 font-body-md text-body-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow text-on-surface dark:text-white uppercase"
              placeholder={`Your ${form.taxRegime} number`}
            />
          </div>

          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">
              Default Tax Rate (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={form.defaultTaxRatePercent}
              onChange={(e) => setForm({ ...form, defaultTaxRatePercent: e.target.value })}
              className="w-full h-[44px] bg-white dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg px-4 font-body-md text-body-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow text-on-surface dark:text-white"
            />
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border dark:border-dark-border">
          <label className="flex items-start gap-4 cursor-pointer group p-4 rounded-xl border border-border dark:border-dark-border bg-surface-container-lowest dark:bg-zinc-900/50 hover:bg-surface-container-low dark:hover:bg-zinc-800 transition-colors">
            <div className="relative flex items-center justify-center mt-1">
              <input
                type="checkbox"
                checked={form.taxInclusive}
                onChange={(e) => setForm({ ...form, taxInclusive: e.target.checked })}
                className="peer sr-only"
              />
              <div className="w-5 h-5 border-2 border-outline dark:border-zinc-500 rounded flex items-center justify-center peer-checked:bg-indigo-500 peer-checked:border-indigo-500 transition-colors">
                <svg className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div>
              <p className="font-body-md text-body-md font-semibold text-on-surface dark:text-white">
                Prices are Tax Inclusive
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-zinc-400 mt-1">
                If checked, service prices already include tax. The invoice will calculate tax backwards from the total. If unchecked, tax will be added on top of the subtotal.
              </p>
            </div>
          </label>
        </div>
      </div>

      <div className="bg-card dark:bg-dark-card rounded-[24px] border border-border dark:border-dark-border shadow-sm p-8 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-blue-500"></div>

        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Receipt className="w-6 h-6 text-blue-500" />
              <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white font-semibold">Invoice Preferences</h2>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant dark:text-outline">
              Set how your invoices are numbered and generated.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">
              Invoice Number Prefix
            </label>
            <input
              type="text"
              value={form.invoicePrefix}
              onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })}
              className="w-full h-[44px] bg-white dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg px-4 font-body-md text-body-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-on-surface dark:text-white uppercase"
              placeholder="INV"
            />
            <p className="text-[12px] text-on-surface-variant dark:text-zinc-500 mt-2">
              Next invoice will be: <strong>{form.invoicePrefix || 'INV'}-2026-XXXX</strong>
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-[44px] px-6 bg-primary hover:bg-primary/90 text-on-primary rounded-full font-label-lg text-label-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
