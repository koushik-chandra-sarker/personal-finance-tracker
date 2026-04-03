import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export async function getCategories(userId: string) {
  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
    include: {
      _count: {
        select: { transactions: true, budgets: true }
      }
    }
  });

  const userIds = new Set<string>();
  categories.forEach(c => {
    if (c.createdById) userIds.add(c.createdById);
    if (c.updatedById) userIds.add(c.updatedById);
  });
  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(userIds) } },
    select: { id: true, name: true },
  });
  const userMap = new Map(users.map(u => [u.id, u.name]));

  return categories.map(c => ({
    ...c,
    createdByName: c.createdById ? userMap.get(c.createdById) || null : null,
    updatedByName: c.updatedById ? userMap.get(c.updatedById) || null : null,
  }));
}

export async function createCategory(userId: string, executorId: string, data: { name: string; type: 'INCOME' | 'EXPENSE'; color: string; icon: string }) {
  // Check if a category with this name and type already exists for the user
  const existing = await prisma.category.findUnique({
    where: { userId_name_type: { userId, name: data.name, type: data.type } },
  });

  if (existing) {
    throw new Error(`A(n) ${data.type.toLowerCase()} category named "${data.name}" already exists.`);
  }

  return prisma.category.create({
    data: {
      userId,
      name: data.name,
      type: data.type,
      color: data.color,
      icon: data.icon,
      isDefault: false,
      createdById: executorId,
      updatedById: executorId,
    },
  });
}

export async function updateCategory(userId: string, executorId: string, id: string, data: { name: string; type: 'INCOME' | 'EXPENSE'; color: string; icon: string }) {
  const category = await prisma.category.findFirst({ where: { id, userId } });
  if (!category) throw new Error('Category not found');

  // Prevent duplicate names on update
  if (category.name !== data.name || category.type !== data.type) {
    const existing = await prisma.category.findUnique({
      where: { userId_name_type: { userId, name: data.name, type: data.type } },
    });
    if (existing) throw new Error(`A(n) ${data.type.toLowerCase()} category named "${data.name}" already exists.`);
  }

  return prisma.category.update({
    where: { id },
    data: {
      ...data,
      updatedById: executorId,
    },
  });
}

export async function deleteCategory(userId: string, id: string) {
  const category = await prisma.category.findFirst({ where: { id, userId } });
  if (!category) throw new Error('Category not found');

  // We are relying on Prisma's onDelete: Cascade for Transaction and Budget.
  await prisma.category.delete({ where: { id } });
  return true;
}
