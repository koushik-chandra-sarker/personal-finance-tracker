import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export async function getCategories(userId: string) {
  return prisma.category.findMany({
    where: { userId },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
    include: {
      _count: {
        select: { transactions: true, budgets: true }
      }
    }
  });
}

export async function createCategory(userId: string, data: { name: string; type: 'INCOME' | 'EXPENSE'; color: string; icon: string }) {
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
    },
  });
}

export async function updateCategory(userId: string, id: string, data: { name: string; type: 'INCOME' | 'EXPENSE'; color: string; icon: string }) {
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
    data,
  });
}

export async function deleteCategory(userId: string, id: string) {
  const category = await prisma.category.findFirst({ where: { id, userId } });
  if (!category) throw new Error('Category not found');

  // We are relying on Prisma's onDelete: Cascade for Transaction and Budget.
  await prisma.category.delete({ where: { id } });
  return true;
}
