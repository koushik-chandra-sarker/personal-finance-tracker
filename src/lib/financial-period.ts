export const DEFAULT_FINANCIAL_MONTH_START_DAY = 1;

export function normalizeFinancialMonthStartDay(value?: number | null) {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 31
    ? Number(value)
    : DEFAULT_FINANCIAL_MONTH_START_DAY;
}

function clampedDay(year: number, zeroBasedMonth: number, requestedDay: number) {
  const lastDay = new Date(year, zeroBasedMonth + 1, 0).getDate();
  return Math.min(requestedDay, lastDay);
}

export function getFinancialMonthDateRange(month: number, year: number, startDay = 1) {
  const day = normalizeFinancialMonthStartDay(startDay);
  const startMonthIndex = month - 1;
  const startDate = new Date(year, startMonthIndex, clampedDay(year, startMonthIndex, day), 0, 0, 0, 0);
  const nextMonthAnchor = new Date(year, startMonthIndex + 1, 1);
  const nextStart = new Date(
    nextMonthAnchor.getFullYear(),
    nextMonthAnchor.getMonth(),
    clampedDay(nextMonthAnchor.getFullYear(), nextMonthAnchor.getMonth(), day),
    0, 0, 0, 0
  );
  const endDate = new Date(nextStart.getTime() - 1);
  return { startDate, endDate };
}

export function getCurrentFinancialMonthYear(now = new Date(), startDay = 1) {
  const day = normalizeFinancialMonthStartDay(startDay);
  const currentBoundaryDay = clampedDay(now.getFullYear(), now.getMonth(), day);
  const anchor = now.getDate() >= currentBoundaryDay
    ? new Date(now.getFullYear(), now.getMonth(), 1)
    : new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { month: anchor.getMonth() + 1, year: anchor.getFullYear() };
}

export function getPreviousFinancialMonth(month: number, year: number) {
  return month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year };
}

export function formatFinancialPeriodRange(month: number, year: number, startDay: number, locale?: string) {
  const { startDate, endDate } = getFinancialMonthDateRange(month, year, startDay);
  const formatter = new Intl.DateTimeFormat(locale || 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${formatter.format(startDate)} – ${formatter.format(endDate)}`;
}

export function formatFinancialPeriodSpan(
  startMonth: number,
  startYear: number,
  endMonth: number,
  endYear: number,
  startDay: number,
  locale?: string
) {
  const startDate = getFinancialMonthDateRange(startMonth, startYear, startDay).startDate;
  const endDate = getFinancialMonthDateRange(endMonth, endYear, startDay).endDate;
  const formatter = new Intl.DateTimeFormat(locale || 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${formatter.format(startDate)} – ${formatter.format(endDate)}`;
}
