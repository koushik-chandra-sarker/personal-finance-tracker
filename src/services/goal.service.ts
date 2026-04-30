import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/lib/utils';
import { createNotificationOnce } from '@/services/notification.service';

export async function getGoals(userId: string) {
  const goals = await prisma.goal.findMany({
    where: { userId },
    include: { progress: { orderBy: { createdAt: 'desc' } } },
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

export async function contributeToGoal(userId: string, executorId: string, id: string, amount: number, description?: string) {
  const goal = await prisma.goal.findFirst({ where: { id, userId } });
  if (!goal) throw new Error('Goal not found');

  const newAmount = Number(goal.currentAmount) + amount;
  const isCompleted = newAmount >= Number(goal.targetAmount);

  const [updatedGoal] = await prisma.$transaction([
    prisma.goal.update({
      where: { id },
      data: {
        currentAmount: newAmount,
        isCompleted,
        updatedById: executorId,
      },
    }),
    prisma.goalProgress.create({
      data: {
        goalId: id,
        amount,
        type: 'CONTRIBUTION',
        description: description || 'Goal contribution',
      },
    }),
  ]);

  if (!goal.isCompleted && isCompleted) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { currency: true } });
      await createNotificationOnce(userId, {
        title: `${goal.name} reached`,
        message: `You reached your ${formatCurrency(Number(goal.targetAmount), user?.currency || 'USD')} goal.`,
        type: 'GOAL_REACHED',
        severity: 'SUCCESS',
        sourceType: 'GOAL',
        sourceId: goal.id,
        dedupeKey: `goal-reached:${goal.id}`,
        actionUrl: '/goals',
      });
    } catch (error) {
      console.error('Failed to create goal reached notification:', error);
    }
  }

  return updatedGoal;
}

export async function deductFromGoal(userId: string, executorId: string, id: string, amount: number, description?: string) {
  const goal = await prisma.goal.findFirst({ where: { id, userId } });
  if (!goal) throw new Error('Goal not found');

  const newAmount = Math.max(0, Number(goal.currentAmount) - amount);
  const isCompleted = newAmount >= Number(goal.targetAmount);

  const [updatedGoal] = await prisma.$transaction([
    prisma.goal.update({
      where: { id },
      data: {
        currentAmount: newAmount,
        isCompleted,
        updatedById: executorId,
      },
    }),
    prisma.goalProgress.create({
      data: {
        goalId: id,
        amount,
        type: 'DEDUCTION',
        description: description || 'Goal deduction',
      },
    }),
  ]);

  return updatedGoal;
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
