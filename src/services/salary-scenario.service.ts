import { prisma } from '@/lib/prisma';
import type { SalaryScenarioInput } from '@/lib/validations/salary-scenario';
import type { SalaryScenarioRow } from '@/types/salary-planner';
import type { Prisma } from '@prisma/client';

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function serializeScenario(row: {
  id: string;
  name: string;
  fiscalYear: string;
  currency: string;
  taxCategory: string;
  grossMonthly: Prisma.Decimal;
  bonusMonths: number;
  structure: Prisma.JsonValue;
  deductions: Prisma.JsonValue;
  budgetRule: string;
  budgetCategories: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): SalaryScenarioRow {
  return {
    id: row.id,
    name: row.name,
    fiscalYear: row.fiscalYear,
    currency: row.currency,
    taxCategory: row.taxCategory === 'female' ? 'female' : 'male',
    grossMonthly: Number(row.grossMonthly),
    bonusMonths: row.bonusMonths,
    structure: row.structure as SalaryScenarioRow['structure'],
    deductions: row.deductions as SalaryScenarioRow['deductions'],
    budgetRule: row.budgetRule as SalaryScenarioRow['budgetRule'],
    budgetCategories: row.budgetCategories as SalaryScenarioRow['budgetCategories'],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getSalaryScenarios(userId: string) {
  const rows = await prisma.salaryScenario.findMany({
    where: { userId },
    orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
  });

  return rows.map(serializeScenario);
}

export async function upsertSalaryScenario(userId: string, data: SalaryScenarioInput, id?: string) {
  const payload = {
    name: data.name.trim(),
    fiscalYear: data.fiscalYear.trim(),
    currency: data.currency.trim().toUpperCase(),
    taxCategory: data.taxCategory,
    grossMonthly: data.grossMonthly,
    bonusMonths: data.bonusMonths,
    structure: toInputJson(data.structure),
    deductions: toInputJson(data.deductions),
    budgetRule: data.budgetRule,
    budgetCategories: toInputJson(data.budgetCategories),
  };

  if (id) {
    const existing = await prisma.salaryScenario.findFirst({ where: { id, userId }, select: { id: true } });
    if (!existing) throw new Error('Salary plan not found.');

    const updated = await prisma.salaryScenario.update({
      where: { id },
      data: payload,
    });
    return serializeScenario(updated);
  }

  const created = await prisma.salaryScenario.create({
    data: {
      userId,
      ...payload,
    },
  });

  return serializeScenario(created);
}

export async function deleteSalaryScenario(userId: string, id: string) {
  const existing = await prisma.salaryScenario.findFirst({ where: { id, userId }, select: { id: true } });
  if (!existing) throw new Error('Salary plan not found.');

  await prisma.salaryScenario.delete({ where: { id } });
}
