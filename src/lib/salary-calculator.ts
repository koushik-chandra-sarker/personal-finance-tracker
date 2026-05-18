// Bangladesh Fiscal Year 2025-26 Tax Slabs
// Source: National Board of Revenue (NBR), Bangladesh

export type TaxSlab = { min: number; max: number | null; rate: number; label: string };
export type DeductionItem = { id: string; label: string; amount: number; isPercentage: boolean; percentOf?: 'basic' | 'gross' };
export type SalaryTaxCategory = 'male' | 'female';
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
  employmentExemptionAnnual: number;
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
  { min: 0, max: 375000, rate: 0, label: 'Up to ৳3,75,000' },
  { min: 375000, max: 675000, rate: 10, label: '৳3,75,001 – ৳6,75,000' },
  { min: 675000, max: 1075000, rate: 15, label: '৳6,75,001 – ৳10,75,000' },
  { min: 1075000, max: 1575000, rate: 20, label: '৳10,75,001 – ৳15,75,000' },
  { min: 1575000, max: 3575000, rate: 25, label: '৳15,75,001 – ৳35,75,000' },
  { min: 3575000, max: null, rate: 30, label: 'Above ৳35,75,000' },
];

// Female / 65+ / disabled gets higher exemption
export const BD_TAX_SLABS_FEMALE_2025_26: TaxSlab[] = [
  { min: 0, max: 425000, rate: 0, label: 'Up to ৳4,25,000' },
  { min: 425000, max: 725000, rate: 10, label: '৳4,25,001 – ৳7,25,000' },
  { min: 725000, max: 1125000, rate: 15, label: '৳7,25,001 – ৳11,25,000' },
  { min: 1125000, max: 1625000, rate: 20, label: '৳11,25,001 – ৳16,25,000' },
  { min: 1625000, max: 3625000, rate: 25, label: '৳16,25,001 – ৳36,25,000' },
  { min: 3625000, max: null, rate: 30, label: 'Above ৳36,25,000' },
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

export function getBangladeshFiscalYear(date = new Date()) {
  const year = date.getFullYear();
  return date.getMonth() >= 6 ? `${year}-${(year + 1).toString().slice(2)}` : `${year - 1}-${year.toString().slice(2)}`;
}

export function getSalaryValidationMessages(
  grossMonthly: number,
  structure: SalaryStructure,
  deductions: DeductionItem[],
  bonusMonths: number,
) {
  const messages: string[] = [];
  const basicMonthly = (grossMonthly * structure.basicPercent) / 100;
  const houseRentMonthly = (basicMonthly * structure.houseRentPercent) / 100;
  const medicalMonthly = (basicMonthly * structure.medicalPercent) / 100;
  const fixedStructureTotal = basicMonthly + houseRentMonthly + medicalMonthly + structure.conveyanceFlat;
  const totalDeductionsMonthly = deductions.reduce((sum, item) => {
    const base = item.percentOf === 'basic' ? basicMonthly : grossMonthly;
    return sum + (item.isPercentage ? (base * item.amount) / 100 : item.amount);
  }, 0);
  const grossAnnual = grossMonthly * 12 + basicMonthly * bonusMonths;

  if (fixedStructureTotal > grossMonthly) {
    messages.push('Salary structure exceeds gross monthly salary. Reduce basic, allowances, or conveyance.');
  }
  if (deductions.some((item) => item.isPercentage && item.amount > 50)) {
    messages.push('One or more percentage deductions are above 50%. Confirm that this is intentional.');
  }
  if (totalDeductionsMonthly > grossMonthly) {
    messages.push('Monthly deductions are higher than gross salary.');
  }
  if (grossAnnual <= 0) {
    messages.push('Gross salary must be greater than zero.');
  }

  return messages;
}

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

export function calculateEmploymentTaxBase(grossEmploymentIncome: number) {
  // FY 2025-26 employment income exemption: lower of one-third of employment income or BDT 500,000.
  const employmentExemptionAnnual = Math.min(Math.max(0, grossEmploymentIncome) / 3, 500000);
  return {
    employmentExemptionAnnual,
    taxableIncome: Math.max(0, grossEmploymentIncome - employmentExemptionAnnual),
  };
}

export function calculateSalary(
  grossMonthly: number,
  structure: SalaryStructure,
  deductions: DeductionItem[],
  taxCategory: SalaryTaxCategory,
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
  const { employmentExemptionAnnual, taxableIncome } = calculateEmploymentTaxBase(grossAnnual);
  
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
    employmentExemptionAnnual,
    taxableIncome, totalTax, monthlyTax,
    netAnnual, netMonthly,
    effectiveTaxRate,
    taxSlabBreakdown,
    deductionDetails,
  };
}
