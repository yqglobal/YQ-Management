export interface TaxLine {
  label: string;
  rate: number;
  amount: number;
  taxType: string;
}

export interface TaxRegime {
  name: string;
  rates: number[];
  components: string[];
}

export const TAX_REGIMES: Record<string, TaxRegime> = {
  IN: { name: "India GST", rates: [0, 5, 12, 18, 28], components: ["CGST", "SGST"] },
  ZA: { name: "South Africa VAT", rates: [0, 15], components: ["VAT"] },
  US: { name: "USA Sales Tax", rates: [0, 4, 5, 6, 7, 8, 9, 10], components: ["State Tax"] },
  GB: { name: "UK VAT", rates: [0, 5, 20], components: ["VAT"] },
};

/**
 * Computes tax lines given a subtotal and tax configuration.
 *
 * @param subtotal The pre-tax amount.
 * @param country The 2-letter country code (e.g. IN, ZA).
 * @param taxRatePercent The total tax rate applied.
 * @param isTaxInclusive If true, subtotal already includes the tax and we need to extract it.
 */
export function computeTax(
  subtotal: number,
  country: string,
  taxRatePercent: number,
  isTaxInclusive: boolean = false
): {
  subtotal: number; // For inclusive, this will be adjusted down. For exclusive, it stays the same.
  totalTax: number;
  taxLines: TaxLine[];
  total: number;
} {
  const regime = TAX_REGIMES[country] || { name: "Custom Tax", rates: [taxRatePercent], components: ["Tax"] };

  let actualSubtotal = subtotal;
  let totalTax = 0;

  if (isTaxInclusive) {
    actualSubtotal = Number((subtotal / (1 + taxRatePercent / 100)).toFixed(2));
    totalTax = Number((subtotal - actualSubtotal).toFixed(2));
  } else {
    totalTax = Number((subtotal * (taxRatePercent / 100)).toFixed(2));
  }

  const taxLines: TaxLine[] = [];

  // Split into components (e.g. CGST + SGST for India)
  if (totalTax > 0) {
    const componentAmount = Number((totalTax / regime.components.length).toFixed(2));
    const componentRate = taxRatePercent / regime.components.length;

    regime.components.forEach((comp, index) => {
      // Adjust the last component to account for rounding errors
      const amount = index === regime.components.length - 1 
        ? Number((totalTax - componentAmount * (regime.components.length - 1)).toFixed(2)) 
        : componentAmount;

      taxLines.push({
        label: `${comp} @ ${componentRate}%`,
        rate: componentRate,
        amount,
        taxType: comp,
      });
    });
  }

  return {
    subtotal: actualSubtotal,
    totalTax,
    taxLines,
    total: Number((actualSubtotal + totalTax).toFixed(2)),
  };
}
