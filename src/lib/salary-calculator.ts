// Bangladesh Fiscal Year 2025-26 Tax Slabs
// Source: National Board of Revenue (NBR), Bangladesh

export type TaxSlab = { min: number; max: number | null; rate: number; label: string };
export type DeductionItem = { id: string; label: string; amount: number; isPercentage: boolean; percentOf?: 'basic' | 'gross' };
export type SalaryBreakdown = {
  grossAnnual: number;
  grossMonthly: number;
  basicAnnual: number;
  basicMonthly: number;
  houseRentAnnual: number;
  houseRentMonthly: number;
  medicalAnnual: number;
  medicalMonthly: number;
  conveyanceAnnual: number;
  conveyanceMonthly: number;
  otherAllowanceAnnual: number;
  otherAllowanceMonthly: number;
  totalDeductionsAnnual: number;
  totalDeductionsMonthly: number;
  taxableIncome: number;
  totalTax: number;
  monthlyTax: number;
  netAnnual: number;
  netMonthly: number;
  effectiveTaxRate: number;
  taxSlabBreakdown: { slab: TaxSlab; taxableAmount: number; tax: number }[];
  deductionDetails: { label: string; annual: number; monthly: number }[];
};

export const BD_TAX_SLABS_2025_26: TaxSlab[] = [
  { min: 0, max: 350000, rate: 0, label: 'Up to ৳3,50,000' },
  { min: 350000, max: 450000, rate: 5, label: '৳3,50,001 – ৳4,50,000' },
  { min: 450000, max: 750000, rate: 10, label: '৳4,50,001 – ৳7,50,000' },
  { min: 750000, max: 1150000, rate: 15, label: '৳7,50,001 – ৳11,50,000' },
  { min: 1150000, max: 1650000, rate: 20, label: '৳11,50,001 – ৳16,50,000' },
  { min: 1650000, max: null, rate: 25, label: 'Above ৳16,50,000' },
];

// Female / 65+ / disabled gets higher exemption
export const BD_TAX_SLABS_FEMALE_2025_26: TaxSlab[] = [
  { min: 0, max: 400000, rate: 0, label: 'Up to ৳4,00,000' },
  { min: 400000, max: 500000, rate: 5, label: '৳4,00,001 – ৳5,00,000' },
  { min: 500000, max: 800000, rate: 10, label: '৳5,00,001 – ৳8,00,000' },
  { min: 800000, max: 1200000, rate: 15, label: '৳8,00,001 – ৳12,00,000' },
  { min: 1200000, max: 1700000, rate: 20, label: '৳12,00,001 – ৳17,00,000' },
  { min: 1700000, max: null, rate: 25, label: 'Above ৳17,00,000' },
];

export const DEFAULT_DEDUCTIONS: DeductionItem[] = [
  { id: 'pf', label: 'Provident Fund (PF)', amount: 0, isPercentage: true, percentOf: 'basic' },
  { id: 'insurance', label: 'Life Insurance', amount: 0, isPercentage: false },
  { id: 'other', label: 'Other Deductions', amount: 0, isPercentage: false },
];

export type SalaryStructure = {
  basicPercent: number;       // % of gross
  houseRentPercent: number;   // % of basic
  medicalPercent: number;     // % of basic
  conveyanceFlat: number;     // flat amount
};

export const DEFAULT_STRUCTURE: SalaryStructure = {
  basicPercent: 60,
  houseRentPercent: 50,
  medicalPercent: 10,
  conveyanceFlat: 2500,
};

export function calculateTax(taxableIncome: number, slabs: TaxSlab[]): { total: number; breakdown: { slab: TaxSlab; taxableAmount: number; tax: number }[] } {
  let remaining = taxableIncome;
  const breakdown: { slab: TaxSlab; taxableAmount: number; tax: number }[] = [];
  let total = 0;

  for (const slab of slabs) {
    if (remaining <= 0) {
      breakdown.push({ slab, taxableAmount: 0, tax: 0 });
      continue;
    }
    const slabWidth = slab.max !== null ? slab.max - slab.min : Infinity;
    const taxableAmount = Math.min(remaining, slabWidth);
    const tax = (taxableAmount * slab.rate) / 100;
    breakdown.push({ slab, taxableAmount, tax });
    total += tax;
    remaining -= taxableAmount;
  }

  return { total, breakdown };
}

export function calculateSalary(
  grossMonthly: number,
  structure: SalaryStructure,
  deductions: DeductionItem[],
  taxCategory: 'male' | 'female',
  bonusMonths: number = 2,
  customMaleSlabs?: TaxSlab[],
  customFemaleSlabs?: TaxSlab[]
): SalaryBreakdown {
  const basicMonthly = (grossMonthly * structure.basicPercent) / 100;
  const houseRentMonthly = (basicMonthly * structure.houseRentPercent) / 100;
  const medicalMonthly = (basicMonthly * structure.medicalPercent) / 100;
  const conveyanceMonthly = structure.conveyanceFlat;
  const otherAllowanceMonthly = grossMonthly - basicMonthly - houseRentMonthly - medicalMonthly - conveyanceMonthly;

  const grossAnnual = grossMonthly * 12 + (basicMonthly * bonusMonths);

  const deductionDetails: { label: string; annual: number; monthly: number }[] = [];
  let totalDeductionsMonthly = 0;

  for (const d of deductions) {
    let monthly = 0;
    if (d.isPercentage) {
      const base = d.percentOf === 'basic' ? basicMonthly : grossMonthly;
      monthly = (base * d.amount) / 100;
    } else {
      monthly = d.amount;
    }
    totalDeductionsMonthly += monthly;
    deductionDetails.push({ label: d.label, annual: monthly * 12, monthly });
  }

  const totalDeductionsAnnual = totalDeductionsMonthly * 12;
  const taxableIncome = Math.max(0, grossAnnual - totalDeductionsAnnual);
  
  let slabs = taxCategory === 'female' ? BD_TAX_SLABS_FEMALE_2025_26 : BD_TAX_SLABS_2025_26;
  if (taxCategory === 'female' && customFemaleSlabs && customFemaleSlabs.length > 0) {
    slabs = customFemaleSlabs;
  } else if (taxCategory === 'male' && customMaleSlabs && customMaleSlabs.length > 0) {
    slabs = customMaleSlabs;
  }
  const { total: totalTax, breakdown: taxSlabBreakdown } = calculateTax(taxableIncome, slabs);
  const monthlyTax = totalTax / 12;
  const netAnnual = grossAnnual - totalDeductionsAnnual - totalTax;
  const netMonthly = netAnnual / 12;
  const effectiveTaxRate = grossAnnual > 0 ? (totalTax / grossAnnual) * 100 : 0;

  return {
    grossAnnual, grossMonthly,
    basicAnnual: basicMonthly * 12, basicMonthly,
    houseRentAnnual: houseRentMonthly * 12, houseRentMonthly,
    medicalAnnual: medicalMonthly * 12, medicalMonthly,
    conveyanceAnnual: conveyanceMonthly * 12, conveyanceMonthly,
    otherAllowanceAnnual: Math.max(0, otherAllowanceMonthly) * 12, otherAllowanceMonthly: Math.max(0, otherAllowanceMonthly),
    totalDeductionsAnnual, totalDeductionsMonthly,
    taxableIncome, totalTax, monthlyTax,
    netAnnual, netMonthly,
    effectiveTaxRate,
    taxSlabBreakdown,
    deductionDetails,
  };
}
