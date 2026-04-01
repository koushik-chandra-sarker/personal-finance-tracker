import { prisma } from '@/lib/prisma';

export async function getGoals(userId: string) {
  return prisma.goal.findMany({
    where: { userId },
    orderBy: { deadline: 'asc' },
  });
}

export async function createGoal(userId: string, data: {
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
    },
  });
}

export async function contributeToGoal(userId: string, id: string, amount: number) {
  const goal = await prisma.goal.findFirst({ where: { id, userId } });
  if (!goal) throw new Error('Goal not found');

  const newAmount = Number(goal.currentAmount) + amount;
  const isCompleted = newAmount >= Number(goal.targetAmount);

  return prisma.goal.update({
    where: { id },
    data: {
      currentAmount: newAmount,
      isCompleted,
    },
  });
}

export async function updateGoal(userId: string, id: string, data: {
  name?: string; targetAmount?: number; deadline?: string; color?: string; icon?: string;
}) {
  const goal = await prisma.goal.findFirst({ where: { id, userId } });
  if (!goal) throw new Error('Goal not found');

  return prisma.goal.update({
    where: { id },
    data: {
      ...data,
      deadline: data.deadline ? new Date(data.deadline) : undefined,
    },
  });
}

export async function deleteGoal(userId: string, id: string) {
  const goal = await prisma.goal.findFirst({ where: { id, userId } });
  if (!goal) throw new Error('Goal not found');
  await prisma.goal.delete({ where: { id } });
  return true;
}
