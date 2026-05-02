import { prisma } from '@/lib/prisma';
import { Prisma, type FinancialNoteMode, type FinancialNoteStatus, type FinancialNoteValueType } from '@prisma/client';
import type { FinancialNoteInput } from '@/lib/validations/financial-note';
import type { FinancialNoteFilters } from '@/types';

function normalizeTags(tags?: string[]) {
  return Array.from(new Set((tags || []).map(tag => tag.trim()).filter(Boolean)));
}

function parseOptionalDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildNoteData(data: FinancialNoteInput) {
  const common = {
    mode: data.mode,
    title: data.title,
    description: data.description,
    tags: normalizeTags(data.tags),
  };

  if (data.mode === 'SIMPLE') {
    return {
      ...common,
      counterpartyName: null,
      valueType: null,
      amount: null,
      assetName: null,
      assetDetails: null,
      providedDate: null,
      expectedReturnDate: null,
      returnedDate: null,
      status: null,
    };
  }

  return {
    ...common,
    counterpartyName: data.counterpartyName || null,
    valueType: data.valueType || null,
    amount: data.amount ?? null,
    assetName: data.assetName || null,
    assetDetails: data.assetDetails || null,
    providedDate: parseOptionalDate(data.providedDate),
    expectedReturnDate: parseOptionalDate(data.expectedReturnDate),
    returnedDate: parseOptionalDate(data.returnedDate),
    status: data.status || 'OPEN',
  };
}

export async function getFinancialNotes(userId: string, filters: FinancialNoteFilters = {}) {
  const {
    search,
    mode,
    status,
    valueType,
    tags,
    dueFrom,
    dueTo,
    page = 1,
    limit = 50,
    sortBy = 'createdAt_desc',
  } = filters;

  const where: Prisma.FinancialNoteWhereInput = { userId };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { counterpartyName: { contains: search, mode: 'insensitive' } },
      { assetName: { contains: search, mode: 'insensitive' } },
      { assetDetails: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (mode) where.mode = mode as FinancialNoteMode;
  if (status) where.status = status as FinancialNoteStatus;
  if (valueType) where.valueType = valueType as FinancialNoteValueType;
  if (tags && tags.length > 0) where.tags = { hasSome: tags };

  if (dueFrom || dueTo) {
    where.expectedReturnDate = {};
    if (dueFrom) {
      const date = new Date(dueFrom);
      date.setUTCHours(0, 0, 0, 0);
      where.expectedReturnDate.gte = date;
    }
    if (dueTo) {
      const date = new Date(dueTo);
      date.setUTCHours(23, 59, 59, 999);
      where.expectedReturnDate.lte = date;
    }
  }

  let orderBy: Prisma.FinancialNoteOrderByWithRelationInput | Prisma.FinancialNoteOrderByWithRelationInput[] = [
    { createdAt: 'desc' },
  ];

  switch (sortBy) {
    case 'createdAt_asc':
      orderBy = [{ createdAt: 'asc' }];
      break;
    case 'due_asc':
      orderBy = [{ expectedReturnDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }];
      break;
    case 'due_desc':
      orderBy = [{ expectedReturnDate: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }];
      break;
    case 'title_asc':
      orderBy = [{ title: 'asc' }];
      break;
    case 'createdAt_desc':
    default:
      orderBy = [{ createdAt: 'desc' }];
      break;
  }

  const [notes, total] = await Promise.all([
    prisma.financialNote.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.financialNote.count({ where }),
  ]);

  const userIds = new Set<string>();
  notes.forEach(note => {
    if (note.createdById) userIds.add(note.createdById);
    if (note.updatedById) userIds.add(note.updatedById);
  });
  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(userIds) } },
    select: { id: true, name: true },
  });
  const userMap = new Map(users.map(user => [user.id, user.name]));

  return {
    notes: notes.map(note => ({
      ...note,
      createdByName: note.createdById ? userMap.get(note.createdById) || null : null,
      updatedByName: note.updatedById ? userMap.get(note.updatedById) || null : null,
    })),
    total,
    pages: Math.ceil(total / limit),
  };
}

export async function createFinancialNote(userId: string, executorId: string, data: FinancialNoteInput) {
  return prisma.financialNote.create({
    data: {
      userId,
      ...buildNoteData(data),
      createdById: executorId,
      updatedById: executorId,
    },
  });
}

export async function updateFinancialNote(userId: string, executorId: string, id: string, data: FinancialNoteInput) {
  const note = await prisma.financialNote.findFirst({ where: { id, userId } });
  if (!note) throw new Error('Note not found');

  return prisma.financialNote.update({
    where: { id },
    data: {
      ...buildNoteData(data),
      updatedById: executorId,
    },
  });
}

export async function deleteFinancialNote(userId: string, id: string) {
  const note = await prisma.financialNote.findFirst({ where: { id, userId } });
  if (!note) throw new Error('Note not found');

  await prisma.financialNote.delete({ where: { id } });
  return true;
}
