import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/lib/utils';
import { createNotificationOnce } from '@/services/notification.service';
import { randomUUID } from 'crypto';
import type { Goal } from '@prisma/client';

async function getGoalTransferCategoryId(userId: string, executorId: string, type: 'INCOME' | 'EXPENSE') {
  const isIncome = type === 'INCOME';
  const name = isIncome ? 'Goal Withdrawals' : 'Savings Goals';
  const icon = isIncome ? 'arrow-down-left' : 'target';
  const color = isIncome ? '#06b6d4' : '#10b981';

  const [category] = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "Category" ("id", "userId", "name", "type", "icon", "color", "isDefault", "createdAt", "createdById", "updatedById")
    VALUES (${randomUUID()}, ${userId}, ${name}, ${type}::"CategoryType", ${icon}, ${color}, true, NOW(), ${executorId}, ${executorId})
    ON CONFLICT ("userId", "name", "type") DO UPDATE SET "name" = EXCLUDED."name"
    RETURNING "id"
  `;

  return category.id;
}

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

export async function contributeToGoal(
  userId: string,
  executorId: string,
  id: string,
  accountId: string,
  amount: number,
  description?: string
) {
  const goal = await prisma.goal.findFirst({ where: { id, userId } });
  if (!goal) throw new Error('Goal not found');

  const account = await prisma.account.findFirst({ where: { id: accountId, userId, isActive: true }, select: { id: true } });
  if (!account) throw new Error('Account not found');

  const cleanDescription = description?.trim();
  const transactionDescription = cleanDescription || `Contribution to ${goal.name}`;
  const newAmount = Number(goal.currentAmount) + amount;
  const isCompleted = newAmount >= Number(goal.targetAmount);
  const categoryId = await getGoalTransferCategoryId(userId, executorId, 'EXPENSE');
  const progressId = randomUUID();
  const transactionId = randomUUID();

  const [updatedGoal] = await prisma.$queryRaw<Goal[]>`
    WITH updated_goal AS (
      UPDATE "Goal"
      SET "currentAmount" = ${newAmount}, "isCompleted" = ${isCompleted}, "updatedById" = ${executorId}, "updatedAt" = NOW()
      WHERE "id" = ${id} AND "userId" = ${userId}
      RETURNING *
    ),
    inserted_progress AS (
      INSERT INTO "GoalProgress" ("id", "goalId", "amount", "type", "description", "createdAt")
      SELECT ${progressId}, "id", ${amount}, 'CONTRIBUTION'::"GoalTransactionType", ${cleanDescription || 'Goal contribution'}, NOW()
      FROM updated_goal
      RETURNING "id"
    ),
    inserted_transaction AS (
      INSERT INTO "Transaction" ("id", "userId", "accountId", "categoryId", "type", "amount", "description", "date", "tags", "isRecurring", "createdAt", "updatedAt", "createdById", "updatedById")
      SELECT
        ${transactionId}, ${userId}, ${accountId}, ${categoryId}, 'EXPENSE'::"CategoryType", ${amount}, ${transactionDescription}, NOW(),
        ARRAY['goal', '__pft:goal-transfer', ${`__pft:goal:${id}`}, ${`__pft:goal-progress:${progressId}`}, '__pft:goal-action:CONTRIBUTION']::TEXT[],
        false, NOW(), NOW(), ${executorId}, ${executorId}
      FROM updated_goal
      RETURNING "id"
    ),
    updated_account AS (
      UPDATE "Account"
      SET "balance" = "balance" - ${amount}, "updatedById" = ${executorId}, "updatedAt" = NOW()
      WHERE "id" = ${accountId} AND "userId" = ${userId}
      RETURNING "id"
    )
    SELECT updated_goal.* FROM updated_goal, inserted_progress, inserted_transaction, updated_account
  `;
  if (!updatedGoal) throw new Error('Goal not found');

  if (!goal.isCompleted && isCompleted) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { currency: true } });
      await createNotificationOnce(userId, {
        title: `${goal.name} reached`,
        message: `You reached your ${formatCurrency(Number(goal.targetAmount), user?.currency || 'BDT')} goal.`,
        type: 'GOAL_REACHED',
        severity: 'SUCCESS',
        sourceType: 'GOAL',
        sourceId: id,
        dedupeKey: `goal-reached:${id}`,
        actionUrl: '/goals',
      });
    } catch (error) {
      console.error('Failed to create goal reached notification:', error);
    }
  }

  return updatedGoal;
}

export async function deductFromGoal(
  userId: string,
  executorId: string,
  id: string,
  accountId: string,
  amount: number,
  description?: string
) {
  const goal = await prisma.goal.findFirst({ where: { id, userId } });
  if (!goal) throw new Error('Goal not found');

  const account = await prisma.account.findFirst({ where: { id: accountId, userId, isActive: true }, select: { id: true } });
  if (!account) throw new Error('Account not found');

  const currentAmount = Number(goal.currentAmount);
  if (amount > currentAmount) throw new Error('Insufficient goal balance');

  const cleanDescription = description?.trim();
  const transactionDescription = cleanDescription || `Withdrawal from ${goal.name}`;
  const newAmount = currentAmount - amount;
  const isCompleted = newAmount >= Number(goal.targetAmount);
  const categoryId = await getGoalTransferCategoryId(userId, executorId, 'INCOME');
  const progressId = randomUUID();
  const transactionId = randomUUID();

  const [updatedGoal] = await prisma.$queryRaw<Goal[]>`
    WITH updated_goal AS (
      UPDATE "Goal"
      SET "currentAmount" = ${newAmount}, "isCompleted" = ${isCompleted}, "updatedById" = ${executorId}, "updatedAt" = NOW()
      WHERE "id" = ${id} AND "userId" = ${userId}
      RETURNING *
    ),
    inserted_progress AS (
      INSERT INTO "GoalProgress" ("id", "goalId", "amount", "type", "description", "createdAt")
      SELECT ${progressId}, "id", ${amount}, 'DEDUCTION'::"GoalTransactionType", ${cleanDescription || 'Goal deduction'}, NOW()
      FROM updated_goal
      RETURNING "id"
    ),
    inserted_transaction AS (
      INSERT INTO "Transaction" ("id", "userId", "accountId", "categoryId", "type", "amount", "description", "date", "tags", "isRecurring", "createdAt", "updatedAt", "createdById", "updatedById")
      SELECT
        ${transactionId}, ${userId}, ${accountId}, ${categoryId}, 'INCOME'::"CategoryType", ${amount}, ${transactionDescription}, NOW(),
        ARRAY['goal', '__pft:goal-transfer', ${`__pft:goal:${id}`}, ${`__pft:goal-progress:${progressId}`}, '__pft:goal-action:DEDUCTION']::TEXT[],
        false, NOW(), NOW(), ${executorId}, ${executorId}
      FROM updated_goal
      RETURNING "id"
    ),
    updated_account AS (
      UPDATE "Account"
      SET "balance" = "balance" + ${amount}, "updatedById" = ${executorId}, "updatedAt" = NOW()
      WHERE "id" = ${accountId} AND "userId" = ${userId}
      RETURNING "id"
    )
    SELECT updated_goal.* FROM updated_goal, inserted_progress, inserted_transaction, updated_account
  `;
  if (!updatedGoal) throw new Error('Goal not found');

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
