import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';
import { pathToFileURL } from 'url';

const prisma = new PrismaClient();

const PASSWORD = 'password123';
const TEST_USERS = [
  { key: 'admin', name: 'Test Admin', email: 'admin@test.local', role: 'ADMIN', status: 'ACTIVE' },
  { key: 'main', name: 'Feature Test User', email: 'test@example.com', role: 'USER', status: 'ACTIVE' },
  { key: 'collaborator', name: 'Workspace Collaborator', email: 'collab@test.local', role: 'USER', status: 'ACTIVE' },
  { key: 'free', name: 'Free Blocked User', email: 'free@test.local', role: 'USER', status: 'ACTIVE' },
  { key: 'pastDue', name: 'Past Due User', email: 'pastdue@test.local', role: 'USER', status: 'ACTIVE' },
  { key: 'suspended', name: 'Suspended User', email: 'suspended@test.local', role: 'USER', status: 'SUSPENDED' },
  { key: 'demo', name: 'Legacy Demo User', email: 'demo@example.com', role: 'USER', status: 'ACTIVE' },
];

const TEST_EMAILS = TEST_USERS.map((user) => user.email);
const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days) {
  return new Date(Date.now() - days * DAY_MS);
}

function daysFromNow(days) {
  return new Date(Date.now() + days * DAY_MS);
}

function monthDate(monthOffset, day, hour = 12) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + monthOffset, day, hour);
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

function investmentTag(investmentId) {
  return `__pft:investment:${investmentId}`;
}

function cashflowTag(cashflowId) {
  return `__pft:investment-cashflow:${cashflowId}`;
}

function cashflowTypeTag(type) {
  return `__pft:investment-flow:${type.toLowerCase()}`;
}

function investmentTags(investmentId, cashflowId, type) {
  return [investmentTag(investmentId), cashflowTag(cashflowId), cashflowTypeTag(type)];
}

async function resetKnownTestData() {
  await prisma.userInvite.deleteMany({
    where: {
      OR: [
        { email: { in: TEST_EMAILS } },
        { email: { endsWith: '@invite.test' } },
      ],
    },
  });

  await prisma.user.deleteMany({
    where: { email: { in: TEST_EMAILS } },
  });
}

async function ensureSubscriptionPackages() {
  const featureBullets = [
    'Full dashboard access',
    'Collaborator workspaces',
    'Budgets, goals, notes, and investments',
  ];

  const [trial, monthly, yearly] = await Promise.all([
    prisma.subscriptionPackage.upsert({
      where: { slug: 'pro-trial' },
      update: {
        name: 'Pro Trial',
        description: 'Try full Pro access before choosing a paid package.',
        currency: 'BDT',
        price: 0,
        interval: 'MONTHLY',
        trialDays: 7,
        discountLabel: 'No payment required',
        featureBullets: [
          'Full dashboard access during trial',
          'No bKash or Nagad payment needed',
          'Choose a paid package after trial ends',
        ],
        isActive: true,
        isFeatured: false,
        sortOrder: 5,
      },
      create: {
        id: 'pkg_pro_trial',
        slug: 'pro-trial',
        name: 'Pro Trial',
        description: 'Try full Pro access before choosing a paid package.',
        currency: 'BDT',
        price: 0,
        interval: 'MONTHLY',
        trialDays: 7,
        discountLabel: 'No payment required',
        featureBullets: [
          'Full dashboard access during trial',
          'No bKash or Nagad payment needed',
          'Choose a paid package after trial ends',
        ],
        isActive: true,
        sortOrder: 5,
      },
    }),
    prisma.subscriptionPackage.upsert({
      where: { slug: 'pro-monthly' },
      update: {
        name: 'Pro Monthly',
        description: 'Flexible full access renewed monthly.',
        currency: 'BDT',
        price: 999,
        interval: 'MONTHLY',
        trialDays: 0,
        discountLabel: null,
        featureBullets,
        isActive: true,
        isFeatured: false,
        sortOrder: 10,
      },
      create: {
        id: 'pkg_pro_monthly',
        slug: 'pro-monthly',
        name: 'Pro Monthly',
        description: 'Flexible full access renewed monthly.',
        currency: 'BDT',
        price: 999,
        interval: 'MONTHLY',
        featureBullets,
        sortOrder: 10,
      },
    }),
    prisma.subscriptionPackage.upsert({
      where: { slug: 'pro-yearly' },
      update: {
        name: 'Pro Yearly',
        description: 'Best value for long-term finance tracking.',
        currency: 'BDT',
        price: 9990,
        interval: 'YEARLY',
        trialDays: 0,
        discountLabel: 'Save compared with monthly billing',
        featureBullets,
        isActive: true,
        isFeatured: true,
        sortOrder: 20,
      },
      create: {
        id: 'pkg_pro_yearly',
        slug: 'pro-yearly',
        name: 'Pro Yearly',
        description: 'Best value for long-term finance tracking.',
        currency: 'BDT',
        price: 9990,
        interval: 'YEARLY',
        discountLabel: 'Save compared with monthly billing',
        featureBullets,
        isFeatured: true,
        sortOrder: 20,
      },
    }),
    prisma.subscriptionPackage.upsert({
      where: { slug: 'pro-trial-monthly' },
      update: {
        name: 'Pro Trial Monthly',
        description: 'Trial package used for subscription state testing.',
        currency: 'BDT',
        price: 0,
        interval: 'MONTHLY',
        trialDays: 14,
        discountLabel: 'Internal test package',
        featureBullets: ['Trialing access', 'Admin grant testing'],
        isActive: false,
        isFeatured: false,
        sortOrder: 90,
      },
      create: {
        slug: 'pro-trial-monthly',
        name: 'Pro Trial Monthly',
        description: 'Trial package used for subscription state testing.',
        currency: 'BDT',
        price: 0,
        interval: 'MONTHLY',
        trialDays: 14,
        discountLabel: 'Internal test package',
        featureBullets: ['Trialing access', 'Admin grant testing'],
        isActive: false,
        sortOrder: 90,
      },
    }),
  ]);

  return { monthly, yearly, trial };
}

async function ensureInvestmentDefaults() {
  const systemTypes = [
    {
      slug: 'govt_savings',
      name: 'Sanchayapatra',
      description: 'National Savings Certificates',
      icon: 'landmark',
      color: '#059669',
      hasInterestRate: true,
      hasReturnFrequency: true,
      hasMaturityDate: true,
      hasInstitution: true,
      hasAccountNumber: true,
      returnTypes: ['INTEREST'],
      sortOrder: 1,
    },
    {
      slug: 'fixed_deposit',
      name: 'Fixed Deposit (FDR)',
      description: 'Bank fixed-term deposit with guaranteed interest',
      icon: 'banknote',
      color: '#2563eb',
      hasInterestRate: true,
      hasReturnFrequency: true,
      hasMaturityDate: true,
      hasInstitution: true,
      hasAccountNumber: true,
      returnTypes: ['INTEREST'],
      sortOrder: 2,
    },
    {
      slug: 'dps',
      name: 'DPS',
      description: 'Deposit Pension Scheme with monthly installments',
      icon: 'piggy-bank',
      color: '#7c3aed',
      hasInterestRate: true,
      hasMaturityDate: true,
      hasMonthlyInstallment: true,
      hasInstitution: true,
      hasAccountNumber: true,
      returnTypes: ['INTEREST'],
      sortOrder: 3,
    },
    {
      slug: 'stock',
      name: 'Stock Market',
      description: 'DSE/CSE equities, dividends, and capital gains',
      icon: 'trending-up',
      color: '#dc2626',
      hasQuantity: true,
      hasInstitution: true,
      hasAccountNumber: true,
      returnTypes: ['DIVIDEND', 'CAPITAL_GAIN'],
      sortOrder: 4,
    },
    {
      slug: 'gold',
      name: 'Gold / Precious Metals',
      description: 'Physical or digital precious metals',
      icon: 'coins',
      color: '#ca8a04',
      hasQuantity: true,
      returnTypes: ['CAPITAL_GAIN'],
      sortOrder: 7,
    },
  ];

  for (const item of systemTypes) {
    const exists = await prisma.investmentTypeConfig.findFirst({
      where: { userId: null, isSystem: true, slug: item.slug },
      select: { id: true },
    });
    if (!exists) {
      await prisma.investmentTypeConfig.create({
        data: {
          ...item,
          userId: null,
          isSystem: true,
          isActive: true,
          hasReturnFrequency: item.hasReturnFrequency || false,
          hasMonthlyInstallment: item.hasMonthlyInstallment || false,
          hasQuantity: item.hasQuantity || false,
          hasInstitution: item.hasInstitution || false,
          hasAccountNumber: item.hasAccountNumber || false,
        },
      });
    }
  }

  const sanchayapatraConfigs = [
    {
      type: 'poribar',
      name: 'Poribar Sanchayapatra',
      description: 'Monthly profit, specifically for women and senior citizens.',
      rate: 11.52,
      taxThreshold: 500000,
      taxRateBelow: 5,
      taxRateAbove: 10,
      payoutFrequency: 'MONTHLY',
    },
    {
      type: 'pensioner',
      name: 'Pensioner Sanchayapatra',
      description: 'Quarterly profit for retired government employees.',
      rate: 11.76,
      taxThreshold: 500000,
      taxRateBelow: 5,
      taxRateAbove: 10,
      payoutFrequency: 'QUARTERLY',
    },
    {
      type: '5year',
      name: '5-Year Bangladesh Sanchayapatra',
      description: 'Profit paid at maturity after five years.',
      rate: 11.28,
      taxThreshold: 500000,
      taxRateBelow: 5,
      taxRateAbove: 10,
      payoutFrequency: 'AT_MATURITY',
    },
  ];

  for (const config of sanchayapatraConfigs) {
    await prisma.sanchayapatraConfig.upsert({
      where: { type: config.type },
      update: config,
      create: config,
    });
  }
}

async function createUsers(packages) {
  const hashedPassword = await bcrypt.hash(PASSWORD, 12);
  const users = {};

  for (const item of TEST_USERS) {
    users[item.key] = await prisma.user.create({
      data: {
        name: item.name,
        email: item.email,
        password: hashedPassword,
        role: item.role,
        status: item.status,
        currency: 'BDT',
        emailVerifiedAt: item.key === 'free' ? null : daysAgo(30),
        lastLoginAt: item.key === 'suspended' ? daysAgo(40) : daysAgo(item.key === 'main' ? 1 : 7),
        lockedUntil: item.key === 'suspended' ? daysFromNow(2) : null,
      },
    });
  }

  await prisma.userSubscription.createMany({
    data: [
      {
        userId: users.main.id,
        packageId: packages.monthly.id,
        plan: 'PRO',
        interval: 'MONTHLY',
        source: 'SELF_SERVICE',
        status: 'ACTIVE',
        currentPeriodStart: daysAgo(12),
        currentPeriodEnd: daysFromNow(18),
      },
      {
        userId: users.collaborator.id,
        packageId: packages.yearly.id,
        plan: 'PRO',
        interval: 'YEARLY',
        source: 'ADMIN_GRANT',
        status: 'TRIALING',
        currentPeriodStart: daysAgo(3),
        currentPeriodEnd: daysFromNow(11),
        grantedById: users.admin.id,
      },
      {
        userId: users.pastDue.id,
        packageId: packages.monthly.id,
        plan: 'PRO',
        interval: 'MONTHLY',
        source: 'SELF_SERVICE',
        status: 'PAST_DUE',
        currentPeriodStart: daysAgo(45),
        currentPeriodEnd: daysAgo(8),
        providerCustomerId: 'cus_test_past_due',
        providerSubscriptionId: 'sub_test_past_due',
      },
      {
        userId: users.suspended.id,
        packageId: packages.yearly.id,
        plan: 'PRO',
        interval: 'YEARLY',
        source: 'ADMIN_GRANT',
        status: 'CANCELED',
        currentPeriodStart: daysAgo(420),
        currentPeriodEnd: daysAgo(55),
        cancelAtPeriodEnd: true,
        grantedById: users.admin.id,
      },
      {
        userId: users.demo.id,
        packageId: packages.monthly.id,
        plan: 'PRO',
        interval: 'MONTHLY',
        source: 'SELF_SERVICE',
        status: 'ACTIVE',
        currentPeriodStart: daysAgo(7),
        currentPeriodEnd: daysFromNow(23),
      },
    ],
  });

  await prisma.userInvite.createMany({
    data: [
      {
        email: 'pending.user@invite.test',
        role: 'USER',
        packageId: packages.monthly.id,
        tokenHash: tokenHash('pending-user-invite-token'),
        expiresAt: daysFromNow(7),
        invitedById: users.admin.id,
      },
      {
        email: 'expired.user@invite.test',
        role: 'USER',
        packageId: packages.yearly.id,
        tokenHash: tokenHash('expired-user-invite-token'),
        expiresAt: daysAgo(3),
        invitedById: users.admin.id,
      },
      {
        email: users.collaborator.email,
        role: 'USER',
        packageId: packages.yearly.id,
        tokenHash: tokenHash('accepted-collab-invite-token'),
        expiresAt: daysFromNow(14),
        acceptedAt: daysAgo(2),
        invitedById: users.admin.id,
      },
      {
        email: 'admin.pending@invite.test',
        role: 'ADMIN',
        tokenHash: tokenHash('pending-admin-invite-token'),
        expiresAt: daysFromNow(10),
        invitedById: users.admin.id,
      },
    ],
  });

  return users;
}

async function createMainWorkspace(users) {
  const main = users.main;

  await prisma.notificationPreference.create({
    data: {
      userId: main.id,
      billReminderDaysBefore: 5,
      budgetWarningThreshold: 75,
      budgetCriticalThreshold: 100,
      goalReminderDaysBefore: 10,
      unusualExpenseMultiplier: 1.8,
      unusualExpenseMinAmount: 1000,
      lowBalanceThreshold: 500,
      investmentReminderDaysBefore: 14,
    },
  });

  const accounts = {};
  for (const account of [
    { key: 'bank', name: 'BRAC Bank Salary', type: 'BANK', balance: 142500, color: '#2563eb', icon: 'landmark' },
    { key: 'cash', name: 'Cash Wallet', type: 'CASH', balance: 12800, color: '#16a34a', icon: 'wallet' },
    { key: 'bkash', name: 'bKash Personal', type: 'MOBILE_WALLET', balance: 420, color: '#e11d48', icon: 'smartphone' },
    { key: 'credit', name: 'City Bank Credit Card', type: 'CREDIT_CARD', balance: -18450, color: '#f97316', icon: 'credit-card' },
    { key: 'investment', name: 'Investment Clearing', type: 'INVESTMENT', balance: 69000, color: '#7c3aed', icon: 'trending-up' },
    { key: 'inactive', name: 'Closed DBBL Account', type: 'BANK', balance: 0, color: '#64748b', icon: 'archive', isActive: false },
  ]) {
    accounts[account.key] = await prisma.account.create({
      data: {
        userId: main.id,
        name: account.name,
        type: account.type,
        balance: account.balance,
        color: account.color,
        icon: account.icon,
        isActive: account.isActive !== false,
        createdById: main.id,
        updatedById: main.id,
      },
    });
  }

  const categories = {};
  for (const category of [
    { key: 'salary', name: 'Salary', type: 'INCOME', color: '#10b981', icon: 'wallet-cards' },
    { key: 'freelance', name: 'Freelance', type: 'INCOME', color: '#6366f1', icon: 'briefcase' },
    { key: 'bonus', name: 'Bonus', type: 'INCOME', color: '#14b8a6', icon: 'sparkles' },
    { key: 'groceries', name: 'Groceries', type: 'EXPENSE', color: '#f59e0b', icon: 'shopping-cart' },
    { key: 'rent', name: 'Rent', type: 'EXPENSE', color: '#ef4444', icon: 'home' },
    { key: 'utilities', name: 'Utilities', type: 'EXPENSE', color: '#0ea5e9', icon: 'bolt' },
    { key: 'transport', name: 'Transport', type: 'EXPENSE', color: '#84cc16', icon: 'bus' },
    { key: 'medical', name: 'Medical', type: 'EXPENSE', color: '#ec4899', icon: 'heart-pulse' },
    { key: 'dining', name: 'Dining', type: 'EXPENSE', color: '#f97316', icon: 'utensils' },
    { key: 'shopping', name: 'Shopping', type: 'EXPENSE', color: '#a855f7', icon: 'shopping-bag' },
    { key: 'goalExpense', name: 'Savings Goals', type: 'EXPENSE', color: '#10b981', icon: 'target', isDefault: true },
    { key: 'goalIncome', name: 'Goal Withdrawals', type: 'INCOME', color: '#06b6d4', icon: 'arrow-down-left', isDefault: true },
    { key: 'investmentExpense', name: 'Investments & DPS', type: 'EXPENSE', color: '#6366f1', icon: 'piggy-bank', isDefault: true },
    { key: 'investmentIncome', name: 'Investment Sales & Returns', type: 'INCOME', color: '#10b981', icon: 'trending-up', isDefault: true },
  ]) {
    categories[category.key] = await prisma.category.create({
      data: {
        userId: main.id,
        name: category.name,
        type: category.type,
        color: category.color,
        icon: category.icon,
        isDefault: category.isDefault || false,
        createdById: main.id,
        updatedById: main.id,
      },
    });
  }

  await prisma.transaction.createMany({
    data: [
      { userId: main.id, accountId: accounts.bank.id, categoryId: categories.salary.id, type: 'INCOME', amount: 85000, description: 'Monthly salary - current month', date: monthDate(0, 1), tags: ['payroll'], notes: 'Primary salary deposit', createdById: main.id, updatedById: main.id },
      { userId: main.id, accountId: accounts.bank.id, categoryId: categories.freelance.id, type: 'INCOME', amount: 32000, description: 'Landing page freelance project', date: monthDate(0, 7), tags: ['freelance', 'client'], notes: 'Partially paid invoice', createdById: main.id, updatedById: main.id },
      { userId: main.id, accountId: accounts.bank.id, categoryId: categories.bonus.id, type: 'INCOME', amount: 15000, description: 'Festival bonus', date: monthDate(-1, 22), tags: ['bonus'], createdById: main.id, updatedById: main.id },
      { userId: main.id, accountId: accounts.bank.id, categoryId: categories.rent.id, type: 'EXPENSE', amount: 28000, description: 'Apartment rent', date: monthDate(0, 3), tags: ['home'], isRecurring: true, createdById: main.id, updatedById: main.id },
      { userId: main.id, accountId: accounts.cash.id, categoryId: categories.groceries.id, type: 'EXPENSE', amount: 7200, description: 'Weekly groceries', date: monthDate(0, 4), tags: ['family'], createdById: main.id, updatedById: main.id },
      { userId: main.id, accountId: accounts.bkash.id, categoryId: categories.utilities.id, type: 'EXPENSE', amount: 2450, description: 'Electricity bill', date: monthDate(0, 6), tags: ['bill'], isRecurring: true, createdById: main.id, updatedById: main.id },
      { userId: main.id, accountId: accounts.credit.id, categoryId: categories.shopping.id, type: 'EXPENSE', amount: 18450, description: 'Laptop accessories on credit card', date: monthDate(0, 9), tags: ['card'], createdById: main.id, updatedById: main.id },
      { userId: main.id, accountId: accounts.bank.id, categoryId: categories.medical.id, type: 'EXPENSE', amount: 22000, description: 'Dental treatment spike', date: monthDate(0, 12), tags: ['unusual', 'health'], notes: 'Useful for unusual expense alerts', createdById: main.id, updatedById: main.id },
      { userId: main.id, accountId: accounts.cash.id, categoryId: categories.transport.id, type: 'EXPENSE', amount: 1850, description: 'Ride sharing and metro', date: monthDate(0, 14), tags: ['commute'], createdById: main.id, updatedById: main.id },
      { userId: main.id, accountId: accounts.cash.id, categoryId: categories.dining.id, type: 'EXPENSE', amount: 5400, description: 'Family dinner', date: monthDate(0, 17), tags: ['family'], createdById: main.id, updatedById: main.id },
      { userId: main.id, accountId: accounts.bank.id, categoryId: categories.groceries.id, type: 'EXPENSE', amount: 6500, description: 'Last month grocery run', date: monthDate(-1, 8), tags: ['history'], createdById: main.id, updatedById: main.id },
      { userId: main.id, accountId: accounts.bank.id, categoryId: categories.utilities.id, type: 'EXPENSE', amount: 3150, description: 'Last month internet bill', date: monthDate(-1, 11), tags: ['history', 'bill'], createdById: main.id, updatedById: main.id },
      { userId: main.id, accountId: accounts.bank.id, categoryId: categories.salary.id, type: 'INCOME', amount: 85000, description: 'Previous salary', date: monthDate(-1, 1), tags: ['payroll', 'history'], createdById: main.id, updatedById: main.id },
    ],
  });

  await prisma.budget.createMany({
    data: [
      { userId: main.id, categoryId: categories.groceries.id, amount: 12000, month: monthDate(0, 1).getMonth() + 1, year: monthDate(0, 1).getFullYear(), rolloverEnabled: true, createdById: main.id, updatedById: main.id },
      { userId: main.id, categoryId: categories.rent.id, amount: 28000, month: monthDate(0, 1).getMonth() + 1, year: monthDate(0, 1).getFullYear(), createdById: main.id, updatedById: main.id },
      { userId: main.id, categoryId: categories.utilities.id, amount: 3000, month: monthDate(0, 1).getMonth() + 1, year: monthDate(0, 1).getFullYear(), createdById: main.id, updatedById: main.id },
      { userId: main.id, categoryId: categories.medical.id, amount: 8000, month: monthDate(0, 1).getMonth() + 1, year: monthDate(0, 1).getFullYear(), createdById: main.id, updatedById: main.id },
      { userId: main.id, categoryId: categories.groceries.id, amount: 15000, month: monthDate(-1, 1).getMonth() + 1, year: monthDate(-1, 1).getFullYear(), rolloverEnabled: true, createdById: main.id, updatedById: main.id },
    ],
  });

  await prisma.recurringTransaction.createMany({
    data: [
      { userId: main.id, accountId: accounts.bank.id, categoryId: categories.rent.id, type: 'EXPENSE', amount: 28000, description: 'Monthly rent auto reminder', frequency: 'MONTHLY', nextRunDate: daysFromNow(4), isActive: true, createdById: main.id, updatedById: main.id },
      { userId: main.id, accountId: accounts.bkash.id, categoryId: categories.utilities.id, type: 'EXPENSE', amount: 2500, description: 'Internet bill due soon', frequency: 'MONTHLY', nextRunDate: daysFromNow(2), isActive: true, createdById: main.id, updatedById: main.id },
      { userId: main.id, accountId: accounts.bank.id, categoryId: categories.salary.id, type: 'INCOME', amount: 85000, description: 'Salary schedule', frequency: 'MONTHLY', nextRunDate: daysFromNow(23), isActive: true, createdById: main.id, updatedById: main.id },
      { userId: main.id, accountId: accounts.credit.id, categoryId: categories.shopping.id, type: 'EXPENSE', amount: 4000, description: 'Inactive card subscription', frequency: 'MONTHLY', nextRunDate: daysAgo(10), isActive: false, createdById: main.id, updatedById: main.id },
    ],
  });

  const emergency = await prisma.goal.create({
    data: { userId: main.id, name: 'Emergency Fund', targetAmount: 300000, currentAmount: 185000, deadline: daysFromNow(45), color: '#10b981', icon: 'shield', createdById: main.id, updatedById: main.id },
  });
  const eidTrip = await prisma.goal.create({
    data: { userId: main.id, name: 'Eid Family Trip', targetAmount: 120000, currentAmount: 120000, deadline: daysFromNow(25), color: '#f59e0b', icon: 'plane', isCompleted: true, createdById: main.id, updatedById: main.id },
  });
  const insurance = await prisma.goal.create({
    data: { userId: main.id, name: 'Insurance Premium', targetAmount: 60000, currentAmount: 15000, deadline: daysAgo(5), color: '#ef4444', icon: 'badge-alert', createdById: main.id, updatedById: main.id },
  });

  const goalRows = [
    { goal: emergency, amount: 150000, type: 'CONTRIBUTION', description: 'Opening emergency reserve', date: daysAgo(35), account: accounts.bank, category: categories.goalExpense },
    { goal: emergency, amount: 35000, type: 'CONTRIBUTION', description: 'Monthly top-up', date: daysAgo(8), account: accounts.bank, category: categories.goalExpense },
    { goal: eidTrip, amount: 120000, type: 'CONTRIBUTION', description: 'Completed travel fund', date: daysAgo(15), account: accounts.bank, category: categories.goalExpense },
    { goal: insurance, amount: 25000, type: 'CONTRIBUTION', description: 'Initial insurance reserve', date: daysAgo(20), account: accounts.cash, category: categories.goalExpense },
    { goal: insurance, amount: 10000, type: 'DEDUCTION', description: 'Partial withdrawal for documents', date: daysAgo(4), account: accounts.cash, category: categories.goalIncome },
  ];

  for (const row of goalRows) {
    const progress = await prisma.goalProgress.create({
      data: {
        goalId: row.goal.id,
        amount: row.amount,
        type: row.type,
        description: row.description,
        createdAt: row.date,
      },
    });
    await prisma.transaction.create({
      data: {
        userId: main.id,
        accountId: row.account.id,
        categoryId: row.category.id,
        type: row.type === 'CONTRIBUTION' ? 'EXPENSE' : 'INCOME',
        amount: row.amount,
        description: row.description,
        date: row.date,
        tags: ['goal', '__pft:goal-transfer', `__pft:goal:${row.goal.id}`, `__pft:goal-progress:${progress.id}`, `__pft:goal-action:${row.type}`],
        createdById: main.id,
        updatedById: main.id,
      },
    });
  }

  await prisma.financialNote.createMany({
    data: [
      {
        userId: main.id,
        mode: 'SIMPLE',
        title: 'Remember to reconcile cash wallet',
        description: 'Cash wallet usually drifts after weekly bazar shopping.',
        tags: ['reconcile', 'cash'],
        createdById: main.id,
        updatedById: main.id,
      },
      {
        userId: main.id,
        mode: 'EXTENDED',
        title: 'Loan to cousin Rakib',
        description: 'Short term family loan with partial repayment expected.',
        tags: ['loan', 'family'],
        counterpartyName: 'Rakib Hasan',
        valueType: 'MONEY',
        amount: 25000,
        providedDate: daysAgo(30),
        expectedReturnDate: daysFromNow(20),
        status: 'PARTIAL',
        createdById: main.id,
        updatedById: main.id,
      },
      {
        userId: main.id,
        mode: 'EXTENDED',
        title: 'Camera lens borrowed by colleague',
        description: 'Asset return note to test asset-only note details.',
        tags: ['asset', 'office'],
        counterpartyName: 'Nabila Chowdhury',
        valueType: 'ASSET',
        assetName: 'Sony 35mm Lens',
        assetDetails: 'Serial ending 4421, with pouch.',
        providedDate: daysAgo(12),
        expectedReturnDate: daysFromNow(5),
        status: 'OPEN',
        createdById: main.id,
        updatedById: main.id,
      },
      {
        userId: main.id,
        mode: 'EXTENDED',
        title: 'Returned advance from vendor',
        description: 'Closed note for returned flow.',
        tags: ['vendor'],
        counterpartyName: 'Print House BD',
        valueType: 'MONEY_AND_ASSET',
        amount: 12000,
        assetName: 'Event banner files',
        providedDate: daysAgo(60),
        expectedReturnDate: daysAgo(20),
        returnedDate: daysAgo(18),
        status: 'RETURNED',
        createdById: main.id,
        updatedById: main.id,
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      { userId: main.id, title: 'Budget crossed', message: 'Medical spending crossed the critical budget threshold.', type: 'BUDGET_ALERT', severity: 'CRITICAL', sourceType: 'BUDGET', actionUrl: '/budgets', dedupeKey: 'seed:budget-critical' },
      { userId: main.id, title: 'Low bKash balance', message: 'bKash Personal is below your low balance threshold.', type: 'LOW_BALANCE', severity: 'WARNING', sourceType: 'ACCOUNT', sourceId: accounts.bkash.id, actionUrl: '/accounts', dedupeKey: 'seed:low-bkash' },
      { userId: main.id, title: 'Goal deadline passed', message: 'Insurance Premium needs attention because the deadline passed.', type: 'GOAL_DEADLINE', severity: 'WARNING', sourceType: 'GOAL', sourceId: insurance.id, actionUrl: '/goals', dedupeKey: 'seed:goal-overdue' },
      { userId: main.id, title: 'Goal reached', message: 'Eid Family Trip is fully funded.', type: 'GOAL_REACHED', severity: 'SUCCESS', sourceType: 'GOAL', sourceId: eidTrip.id, actionUrl: '/goals', dedupeKey: 'seed:goal-reached' },
      { userId: main.id, title: 'Unusual expense detected', message: 'Dental treatment spike is higher than usual.', type: 'UNUSUAL_EXPENSE', severity: 'INFO', sourceType: 'TRANSACTION', actionUrl: '/transactions', dedupeKey: 'seed:unusual-expense', isRead: true },
      { userId: main.id, title: 'Internet bill due soon', message: 'Your recurring internet bill is due in two days.', type: 'BILL_REMINDER', severity: 'INFO', sourceType: 'RECURRING_TRANSACTION', actionUrl: '/recurring', dedupeKey: 'seed:bill-reminder' },
    ],
  });

  const sharedAccess = await prisma.sharedAccess.create({
    data: {
      ownerId: main.id,
      collaboratorId: users.collaborator.id,
    },
  });
  await prisma.featureAccess.createMany({
    data: [
      { sharedAccessId: sharedAccess.id, feature: 'TRANSACTIONS', accessLevel: 'EDIT' },
      { sharedAccessId: sharedAccess.id, feature: 'ACCOUNTS', accessLevel: 'VIEW' },
      { sharedAccessId: sharedAccess.id, feature: 'BUDGETS', accessLevel: 'VIEW' },
      { sharedAccessId: sharedAccess.id, feature: 'GOALS', accessLevel: 'EDIT' },
      { sharedAccessId: sharedAccess.id, feature: 'INVESTMENTS', accessLevel: 'VIEW' },
      { sharedAccessId: sharedAccess.id, feature: 'SALARY_PLANNER', accessLevel: 'EDIT' },
      { sharedAccessId: sharedAccess.id, feature: 'REPORTS', accessLevel: 'VIEW' },
      { sharedAccessId: sharedAccess.id, feature: 'NOTES', accessLevel: 'EDIT' },
    ],
  });

  return { accounts, categories };
}

async function createInvestments(users, accounts, categories) {
  const main = users.main;
  const typeConfigs = await prisma.investmentTypeConfig.findMany({
    where: { userId: null, isSystem: true, slug: { in: ['govt_savings', 'fixed_deposit', 'dps', 'stock', 'gold'] } },
  });
  const types = Object.fromEntries(typeConfigs.map((type) => [type.slug, type]));
  const poribar = await prisma.sanchayapatraConfig.findUnique({ where: { type: 'poribar' } });

  const customCrypto = await prisma.investmentTypeConfig.create({
    data: {
      userId: main.id,
      slug: 'crypto-test-basket',
      name: 'Crypto Test Basket',
      description: 'User-defined type to test custom investment config screens.',
      icon: 'bitcoin',
      color: '#f97316',
      hasQuantity: true,
      hasInstitution: true,
      returnTypes: ['CAPITAL_GAIN'],
      sortOrder: 99,
    },
  });

  const investments = [
    {
      key: 'sanchayapatra',
      typeConfigId: types.govt_savings.id,
      name: 'Poribar Sanchayapatra 2026',
      institutionName: 'Bangladesh Bank',
      accountNumber: 'SP-2026-0001',
      investedAmount: 500000,
      currentValue: 512000,
      interestRate: 11.52,
      returnFrequency: 'MONTHLY',
      purchaseDate: daysAgo(150),
      maturityDate: daysFromNow(75),
      linkedAccountId: accounts.bank.id,
      sanchayapatraConfigId: poribar.id,
      color: '#059669',
      icon: 'landmark',
      notes: 'Upcoming maturity test case.',
    },
    {
      key: 'dps',
      typeConfigId: types.dps.id,
      name: 'Child Education DPS',
      institutionName: 'Dutch-Bangla Bank',
      accountNumber: 'DPS-7788',
      investedAmount: 60000,
      currentValue: 62000,
      interestRate: 8.5,
      purchaseDate: daysAgo(220),
      maturityDate: daysFromNow(900),
      linkedAccountId: accounts.bank.id,
      monthlyInstallment: 10000,
      installmentDueDay: 5,
      missedInstallmentCount: 1,
      lastMissedInstallmentOn: monthDate(-1, 5),
      lastInstallmentPaidOn: monthDate(-2, 5),
      color: '#7c3aed',
      icon: 'piggy-bank',
      notes: 'One missed installment to test DPS warnings.',
    },
    {
      key: 'stock',
      typeConfigId: types.stock.id,
      name: 'DSE Blue Chip Basket',
      institutionName: 'BRAC EPL Stock Brokerage',
      accountNumber: 'BO-9912',
      investedAmount: 125000,
      currentValue: 119500,
      purchaseDate: daysAgo(95),
      linkedAccountId: accounts.investment.id,
      quantity: 1250,
      avgBuyPrice: 100,
      color: '#dc2626',
      icon: 'trending-up',
      notes: 'Negative valuation case.',
    },
    {
      key: 'gold',
      typeConfigId: types.gold.id,
      name: 'Gold Savings',
      investedAmount: 85000,
      currentValue: 96500,
      purchaseDate: daysAgo(300),
      quantity: 1.25,
      avgBuyPrice: 68000,
      color: '#ca8a04',
      icon: 'coins',
      notes: 'Unlinked physical asset case.',
    },
    {
      key: 'closedFdr',
      typeConfigId: types.fixed_deposit.id,
      name: 'Closed FDR Audit Case',
      status: 'MATURED',
      institutionName: 'Eastern Bank',
      accountNumber: 'FDR-4455',
      investedAmount: 200000,
      currentValue: 221000,
      interestRate: 7.25,
      returnFrequency: 'AT_MATURITY',
      purchaseDate: daysAgo(400),
      maturityDate: daysAgo(10),
      soldDate: daysAgo(8),
      linkedAccountId: accounts.bank.id,
      color: '#2563eb',
      icon: 'banknote',
      notes: 'Closed investment cannot be edited like active investments.',
    },
    {
      key: 'crypto',
      typeConfigId: customCrypto.id,
      name: 'Tiny Crypto Watchlist',
      institutionName: 'Manual Tracker',
      investedAmount: 15000,
      currentValue: 17800,
      purchaseDate: daysAgo(45),
      quantity: 0.11,
      avgBuyPrice: 136363.6363,
      color: '#f97316',
      icon: 'bitcoin',
      notes: 'Custom investment type coverage.',
    },
  ];

  const created = {};
  for (const item of investments) {
    const { key, ...data } = item;
    created[key] = await prisma.investment.create({
      data: {
        ...data,
        userId: main.id,
        createdById: main.id,
        updatedById: main.id,
      },
    });
  }

  const flowRows = [
    { investment: created.sanchayapatra, account: accounts.bank, category: categories.investmentExpense, type: 'BUY', amount: 500000, principalAmount: 500000, date: daysAgo(150), description: 'Initial investment in Poribar Sanchayapatra 2026', transactionType: 'EXPENSE' },
    { investment: created.sanchayapatra, account: accounts.bank, category: categories.investmentIncome, type: 'RETURN', amount: 4800, returnAmount: 4800, date: daysAgo(30), description: 'Monthly profit from Poribar Sanchayapatra 2026', transactionType: 'INCOME' },
    { investment: created.dps, account: accounts.bank, category: categories.investmentExpense, type: 'BUY', amount: 10000, principalAmount: 10000, date: daysAgo(220), description: 'Initial investment in Child Education DPS', transactionType: 'EXPENSE', installmentDueDate: monthDate(-7, 5) },
    { investment: created.dps, account: accounts.bank, category: categories.investmentExpense, type: 'INSTALLMENT', amount: 10000, principalAmount: 10000, date: monthDate(-5, 5), description: 'DPS installment for Child Education DPS', transactionType: 'EXPENSE', installmentDueDate: monthDate(-5, 5) },
    { investment: created.dps, account: accounts.bank, category: categories.investmentExpense, type: 'INSTALLMENT', amount: 10000, principalAmount: 10000, date: monthDate(-4, 5), description: 'DPS installment for Child Education DPS', transactionType: 'EXPENSE', installmentDueDate: monthDate(-4, 5) },
    { investment: created.stock, account: accounts.investment, category: categories.investmentExpense, type: 'BUY', amount: 125000, principalAmount: 125000, date: daysAgo(95), description: 'Initial investment in DSE Blue Chip Basket', transactionType: 'EXPENSE' },
    { investment: created.stock, account: accounts.investment, category: categories.investmentIncome, type: 'RETURN', amount: 3200, returnAmount: 3200, date: daysAgo(20), description: 'Dividend from DSE Blue Chip Basket', transactionType: 'INCOME' },
    { investment: created.closedFdr, account: accounts.bank, category: categories.investmentExpense, type: 'BUY', amount: 200000, principalAmount: 200000, date: daysAgo(400), description: 'Initial investment in Closed FDR Audit Case', transactionType: 'EXPENSE' },
    { investment: created.closedFdr, account: accounts.bank, category: categories.investmentIncome, type: 'MATURITY_PAYOUT', amount: 221000, principalAmount: 200000, returnAmount: 21000, date: daysAgo(8), description: 'MATURED: Closed FDR Audit Case', transactionType: 'INCOME' },
  ];

  for (const row of flowRows) {
    const cashflowId = randomUUID();
    const transactionId = randomUUID();
    await prisma.transaction.create({
      data: {
        id: transactionId,
        userId: main.id,
        accountId: row.account.id,
        categoryId: row.category.id,
        type: row.transactionType,
        amount: row.amount,
        description: row.description,
        date: row.date,
        tags: investmentTags(row.investment.id, cashflowId, row.type),
        createdById: main.id,
        updatedById: main.id,
      },
    });
    await prisma.investmentCashflow.create({
      data: {
        id: cashflowId,
        investmentId: row.investment.id,
        transactionId,
        accountId: row.account.id,
        type: row.type,
        amount: row.amount,
        principalAmount: row.principalAmount || 0,
        returnAmount: row.returnAmount || 0,
        date: row.date,
        installmentDueDate: row.installmentDueDate || null,
        description: row.description,
        createdById: main.id,
      },
    });
  }

  await prisma.investmentReturn.createMany({
    data: [
      { investmentId: created.sanchayapatra.id, amount: 4800, type: 'INTEREST', description: 'Monthly profit', date: daysAgo(30) },
      { investmentId: created.stock.id, amount: 3200, type: 'DIVIDEND', description: 'Dividend income', date: daysAgo(20) },
      { investmentId: created.closedFdr.id, amount: 21000, type: 'MATURITY_BENEFIT', description: 'Final FDR profit', date: daysAgo(8) },
    ],
  });

  await prisma.investmentValuation.createMany({
    data: [
      { investmentId: created.sanchayapatra.id, value: 506000, date: monthDate(-2, 25) },
      { investmentId: created.sanchayapatra.id, value: 512000, date: monthDate(0, 10) },
      { investmentId: created.dps.id, value: 52000, date: monthDate(-2, 5) },
      { investmentId: created.dps.id, value: 62000, date: monthDate(0, 5) },
      { investmentId: created.stock.id, value: 132000, date: monthDate(-1, 15) },
      { investmentId: created.stock.id, value: 119500, date: monthDate(0, 15) },
      { investmentId: created.gold.id, value: 96500, date: monthDate(0, 12) },
      { investmentId: created.crypto.id, value: 17800, date: monthDate(0, 18) },
    ],
  });

  await prisma.notification.createMany({
    data: [
      { userId: main.id, title: 'Investment maturity soon', message: 'Poribar Sanchayapatra matures inside the upcoming window.', type: 'INVESTMENT_MATURITY', severity: 'WARNING', sourceType: 'INVESTMENT', sourceId: created.sanchayapatra.id, actionUrl: '/investments', dedupeKey: 'seed:investment-maturity' },
      { userId: main.id, title: 'DPS installment needs review', message: 'Child Education DPS has one missed installment.', type: 'INVESTMENT_RETURN_DUE', severity: 'INFO', sourceType: 'INVESTMENT', sourceId: created.dps.id, actionUrl: '/investments', dedupeKey: 'seed:dps-installment' },
    ],
  });
}

async function createSmallUserWorkspaces(users) {
  const simpleCases = [
    { user: users.collaborator, accountName: 'Collaborator Wallet', hasData: true },
    { user: users.pastDue, accountName: 'Past Due Wallet', hasData: true },
    { user: users.free, accountName: 'Free User Wallet', hasData: false },
    { user: users.demo, accountName: 'Demo Wallet', hasData: true },
  ];

  for (const item of simpleCases) {
    const account = await prisma.account.create({
      data: {
        userId: item.user.id,
        name: item.accountName,
        type: 'BANK',
        balance: item.hasData ? 25000 : 0,
        color: '#2563eb',
        icon: 'wallet',
        createdById: item.user.id,
        updatedById: item.user.id,
      },
    });
    const income = await prisma.category.create({
      data: {
        userId: item.user.id,
        name: 'Salary',
        type: 'INCOME',
        color: '#10b981',
        icon: 'wallet',
        isDefault: true,
        createdById: item.user.id,
        updatedById: item.user.id,
      },
    });
    const expense = await prisma.category.create({
      data: {
        userId: item.user.id,
        name: 'Groceries',
        type: 'EXPENSE',
        color: '#f59e0b',
        icon: 'shopping-cart',
        isDefault: true,
        createdById: item.user.id,
        updatedById: item.user.id,
      },
    });

    if (item.hasData) {
      await prisma.transaction.createMany({
        data: [
          { userId: item.user.id, accountId: account.id, categoryId: income.id, type: 'INCOME', amount: 30000, description: `${item.user.name} salary`, date: daysAgo(12), tags: ['seed'], createdById: item.user.id, updatedById: item.user.id },
          { userId: item.user.id, accountId: account.id, categoryId: expense.id, type: 'EXPENSE', amount: 5000, description: `${item.user.name} groceries`, date: daysAgo(5), tags: ['seed'], createdById: item.user.id, updatedById: item.user.id },
        ],
      });
      await prisma.budget.create({
        data: {
          userId: item.user.id,
          categoryId: expense.id,
          amount: 9000,
          month: monthDate(0, 1).getMonth() + 1,
          year: monthDate(0, 1).getFullYear(),
          createdById: item.user.id,
          updatedById: item.user.id,
        },
      });
    }
  }
}

async function seedTestData() {
  await resetKnownTestData();
  const packages = await ensureSubscriptionPackages();
  await ensureInvestmentDefaults();
  const users = await createUsers(packages);
  const { accounts, categories } = await createMainWorkspace(users);
  await createInvestments(users, accounts, categories);
  await createSmallUserWorkspaces(users);

  const counts = await Promise.all([
    prisma.user.count({ where: { email: { in: TEST_EMAILS } } }),
    prisma.account.count({ where: { userId: users.main.id } }),
    prisma.transaction.count({ where: { userId: users.main.id } }),
    prisma.budget.count({ where: { userId: users.main.id } }),
    prisma.goal.count({ where: { userId: users.main.id } }),
    prisma.investment.count({ where: { userId: users.main.id } }),
    prisma.financialNote.count({ where: { userId: users.main.id } }),
    prisma.notification.count({ where: { userId: users.main.id } }),
    prisma.userInvite.count({ where: { email: { endsWith: '@invite.test' } } }),
  ]);

  return {
    credentials: {
      admin: { email: users.admin.email, password: PASSWORD },
      testUser: { email: users.main.email, password: PASSWORD },
      collaborator: { email: users.collaborator.email, password: PASSWORD },
      freeUser: { email: users.free.email, password: PASSWORD },
      pastDueUser: { email: users.pastDue.email, password: PASSWORD },
      suspendedUser: { email: users.suspended.email, password: PASSWORD },
      demoUser: { email: users.demo.email, password: PASSWORD },
    },
    counts: {
      testUsers: counts[0],
      mainUserAccounts: counts[1],
      mainUserTransactions: counts[2],
      mainUserBudgets: counts[3],
      mainUserGoals: counts[4],
      mainUserInvestments: counts[5],
      mainUserNotes: counts[6],
      mainUserNotifications: counts[7],
      openInvites: counts[8],
    },
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedTestData()
    .then((result) => {
      console.log('Seeded rich FinTrack test data.');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error('Failed to seed test data:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { seedTestData };
