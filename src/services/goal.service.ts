import { prisma } from '@/lib/prisma';

export async function getGoals(userId: string) {
  const goals = await prisma.goal.findMany({
    where: { userId },
    orderBy: { deadline: 'asc' },
  });

  const userIds = new Set<string>();
  goals.forEach(g => {
    if (g.createdById) userIds.add(g.createdById);
    if (g.updatedById) userIds.add(g.updatedById);
  });
  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(userIds) } },
    select: { id: true, name: true },
  });
  const userMap = new Map(users.map(u => [u.id, u.name]));

  return goals.map(g => ({
    ...g,
    createdByName: g.createdById ? userMap.get(g.createdById) || null : null,
    updatedByName: g.updatedById ? userMap.get(g.updatedById) || null : null,
  }));
}

export async function createGoal(userId: string, executorId: string, data: {
  name: string; targetAmount: number; deadline: string; color?: string; icon?: string;
}) {
  return prisma.goal.create({
    data: {
      userId,
      name: data.name,
      targetAmount: data.targetAmount,
      deadline: new Date(data.deadline),
      color: data.color || '#10b981',
      icon: data.icon || 'target',
      createdById: executorId,
      updatedById: executorId,
    },
  });
}

export async function contributeToGoal(userId: string, executorId: string, id: string, amount: number) {
  const goal = await prisma.goal.findFirst({ where: { id, userId } });
  if (!goal) throw new Error('Goal not found');

  const newAmount = Number(goal.currentAmount) + amount;
  const isCompleted = newAmount >= Number(goal.targetAmount);

  return prisma.goal.update({
    where: { id },
    data: {
      currentAmount: newAmount,
      isCompleted,
      updatedById: executorId,
    },
  });
}

export async function updateGoal(userId: string, executorId: string, id: string, data: {
  name?: string; targetAmount?: number; deadline?: string; color?: string; icon?: string;
}) {
  const goal = await prisma.goal.findFirst({ where: { id, userId } });
  if (!goal) throw new Error('Goal not found');

  return prisma.goal.update({
    where: { id },
    data: {
      ...data,
      deadline: data.deadline ? new Date(data.deadline) : undefined,
      updatedById: executorId,
    },
  });
}

export async function deleteGoal(userId: string, id: string) {
  const goal = await prisma.goal.findFirst({ where: { id, userId } });
  if (!goal) throw new Error('Goal not found');
  await prisma.goal.delete({ where: { id } });
  return true;
}
