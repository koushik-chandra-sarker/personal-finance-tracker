import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const hashedPassword = await bcrypt.hash('password123', 10);

    const user = await prisma.user.upsert({
      where: { email: 'demo@example.com' },
      update: {},
      create: {
        name: 'Demo User',
        email: 'demo@example.com',
        password: hashedPassword,
        currency: 'USD',
      },
    });

    const existingAccount = await prisma.account.findFirst({ where: { userId: user.id } });

    if (!existingAccount) {
      const account = await prisma.account.create({
        data: {
          userId: user.id,
          name: 'Main Checking',
          type: 'BANK',
          balance: 5000.00,
          color: '#3b82f6',
          icon: 'wallet',
        },
      });

      const category1 = await prisma.category.create({
        data: { userId: user.id, name: 'Salary', type: 'INCOME', color: '#10b981', icon: 'dollar-sign' },
      });
      const category2 = await prisma.category.create({
        data: { userId: user.id, name: 'Groceries', type: 'EXPENSE', color: '#f59e0b', icon: 'shopping-cart' },
      });
      const category3 = await prisma.category.create({
        data: { userId: user.id, name: 'Rent', type: 'EXPENSE', color: '#ef4444', icon: 'home' },
      });
      const category4 = await prisma.category.create({
        data: { userId: user.id, name: 'Freelance', type: 'INCOME', color: '#6366f1', icon: 'briefcase' },
      });

      await prisma.transaction.createMany({
        data: [
          { userId: user.id, accountId: account.id, categoryId: category1.id, type: 'INCOME', amount: 5500.00, description: 'Monthly Salary', date: new Date() },
          { userId: user.id, accountId: account.id, categoryId: category4.id, type: 'INCOME', amount: 1200.00, description: 'Freelance Project', date: new Date(Date.now() - 86400000 * 3) },
          { userId: user.id, accountId: account.id, categoryId: category2.id, type: 'EXPENSE', amount: 150.00, description: 'Whole Foods', date: new Date() },
          { userId: user.id, accountId: account.id, categoryId: category2.id, type: 'EXPENSE', amount: 350.00, description: 'Costco Run', date: new Date(Date.now() - 86400000 * 2) },
          { userId: user.id, accountId: account.id, categoryId: category3.id, type: 'EXPENSE', amount: 1800.00, description: 'Monthly Rent', date: new Date(Date.now() - 86400000 * 5) },
        ],
      });

      const now = new Date();
      await prisma.budget.create({
        data: { userId: user.id, categoryId: category2.id, amount: 600, month: now.getMonth() + 1, year: now.getFullYear() },
      });
      await prisma.budget.create({
        data: { userId: user.id, categoryId: category3.id, amount: 2000, month: now.getMonth() + 1, year: now.getFullYear() },
      });

      await prisma.goal.create({
        data: { userId: user.id, name: 'Emergency Fund', targetAmount: 10000, currentAmount: 3500, deadline: new Date(Date.now() + 86400000 * 180), color: '#10b981', icon: 'shield' },
      });
      await prisma.goal.create({
        data: { userId: user.id, name: 'Vacation', targetAmount: 5000, currentAmount: 1200, deadline: new Date(Date.now() + 86400000 * 90), color: '#f59e0b', icon: 'plane' },
      });

      return NextResponse.json({
        success: true,
        message: 'Demo user seeded with account, transactions, budgets, and goals',
        credentials: { email: 'demo@example.com', password: 'password123' },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Demo user already exists',
      credentials: { email: 'demo@example.com', password: 'password123' },
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
