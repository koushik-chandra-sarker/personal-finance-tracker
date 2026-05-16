import { TaxCategory } from '@prisma/client';

export type ImportedTaxConfig = {
  fiscalYear: string;
  category: TaxCategory;
  slabIndex: number;
  minAmount: number;
  maxAmount: number | null;
  rate: number;
  label: string;
  source: string;
};

export type TaxImportResult = {
  configs: ImportedTaxConfig[];
  sourceUrl: string;
  sourceTitle: string;
  reviewedAt?: string;
};

const DEFAULT_SOURCE_URL = 'https://taxsummaries.pwc.com/bangladesh/individual/taxes-on-personal-income';

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ndash;|&#8211;/g, '-')
    .replace(/&mdash;|&#8212;/g, '-');
}

function htmlToSearchableText(html: string) {
  return decodeHtml(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<h[1-6][^>]*>/gi, '\n### ')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/(p|tr|li|table|div)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function parseAmount(raw: string) {
  const normalized = raw.toLowerCase().replace(/bdt|tk\.?|taka/g, '').replace(/,/g, '').trim();
  const number = Number(normalized.replace(/million/g, '').trim());
  if (!Number.isFinite(number)) throw new Error(`Unable to parse amount "${raw}".`);
  return normalized.includes('million') ? number * 1_000_000 : number;
}

function formatBDT(amount: number) {
  return `BDT ${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function fiscalYearToken(fiscalYear: string) {
  const match = fiscalYear.trim().match(/^(\d{4})[-/](\d{2})$/);
  if (!match) throw new Error('Use fiscal year format like 2025-26.');
  return `${match[1]}/${match[2]}`;
}

function extractReviewedAt(text: string) {
  return text.match(/Last reviewed\s*-\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/)?.[1];
}

function extractFiscalYearSection(text: string, fiscalYear: string) {
  const token = fiscalYearToken(fiscalYear);
  const start = text.search(new RegExp(`Resident individual[\\s\\S]{0,220}?FY\\s+${token.replace('/', '\\/')}`, 'i'));
  if (start < 0) {
    throw new Error(`Could not find a personal income tax table for FY ${token} in the selected source.`);
  }

  const rest = text.slice(start);
  const nextHeading = rest.slice(10).search(/\n###\s+/);
  return nextHeading > 0 ? rest.slice(0, nextHeading + 10) : rest;
}

function extractGeneralRows(section: string) {
  const tablePart = section.split(/Note:/i)[0];
  const rows: Array<{ kind: 'first' | 'next' | 'rest'; amount: number | null; rate: number }> = [];
  const rowPattern = /(First|Next)\s+([0-9][0-9,]*(?:\s+million)?)\s+(Nil|[0-9]+(?:\.[0-9]+)?)/gi;
  let match: RegExpExecArray | null;

  while ((match = rowPattern.exec(tablePart)) !== null) {
    rows.push({
      kind: match[1].toLowerCase() === 'first' ? 'first' : 'next',
      amount: parseAmount(match[2]),
      rate: match[3].toLowerCase() === 'nil' ? 0 : Number(match[3]),
    });
  }

  const restRate = tablePart.match(/On rest of the income\s+([0-9]+(?:\.[0-9]+)?)/i);
  if (restRate) {
    rows.push({ kind: 'rest', amount: null, rate: Number(restRate[1]) });
  }

  if (rows.length < 2 || rows[0]?.kind !== 'first') {
    throw new Error('The source page was fetched, but its tax table format could not be parsed.');
  }

  return rows;
}

function extractWomenThreshold(section: string) {
  const match = section.match(/basic exemption limit for women and senior citizens aged 65 years or older is BDT\s+([0-9,]+)/i);
  if (!match) return null;
  return parseAmount(match[1]);
}

function buildSlabs(
  fiscalYear: string,
  category: TaxCategory,
  rows: Array<{ kind: 'first' | 'next' | 'rest'; amount: number | null; rate: number }>,
  source: string,
  firstThresholdOverride?: number | null,
) {
  let min = 0;
  return rows.map((row, slabIndex) => {
    const width = slabIndex === 0 && firstThresholdOverride ? firstThresholdOverride : row.amount;
    const max = width === null ? null : min + width;
    const label = max === null ? `Above ${formatBDT(min)}` : slabIndex === 0 ? `Up to ${formatBDT(max)}` : `${formatBDT(min + 1)} - ${formatBDT(max)}`;
    const slab = {
      fiscalYear,
      category,
      slabIndex,
      minAmount: min,
      maxAmount: max,
      rate: row.rate,
      label,
      source,
    };
    min = max ?? min;
    return slab;
  });
}

export async function fetchBangladeshPersonalTaxConfigs(fiscalYear: string, sourceUrl = DEFAULT_SOURCE_URL): Promise<TaxImportResult> {
  const response = await fetch(sourceUrl, {
    cache: 'no-store',
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'user-agent': 'takaPilot tax config importer',
    },
  });

  if (!response.ok) {
    throw new Error(`Tax source returned HTTP ${response.status}.`);
  }

  const html = await response.text();
  const text = htmlToSearchableText(html);
  const section = extractFiscalYearSection(text, fiscalYear);
  const generalRows = extractGeneralRows(section);
  const womenThreshold = extractWomenThreshold(section);
  const reviewedAt = extractReviewedAt(text);
  const sourceTitle = reviewedAt ? `PwC Tax Summaries, last reviewed ${reviewedAt}` : 'PwC Tax Summaries';
  const source = `${sourceTitle} | ${sourceUrl}`;

  return {
    configs: [
      ...buildSlabs(fiscalYear, TaxCategory.MALE, generalRows, source),
      ...buildSlabs(fiscalYear, TaxCategory.FEMALE, generalRows, source, womenThreshold),
    ],
    sourceUrl,
    sourceTitle,
    reviewedAt,
  };
}
