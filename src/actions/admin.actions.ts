'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/rbac';
import type { ActionResponse } from '@/types';
import type { Prisma, SubscriptionInterval, SubscriptionStatus, UserRole } from '@prisma/client';
import type { SubscriptionPackageRow } from '@/actions/settings.actions';

export type AdminUserAccessFilter = 'all' | 'admin' | 'subscribed' | 'no_access';
export type AdminUserSort = 'createdAt_desc' | 'createdAt_asc' | 'name_asc' | 'email_asc';

export type AdminUsersQuery = {
  q?: string;
  role?: UserRole | 'all';
  access?: AdminUserAccessFilter;
  status?: SubscriptionStatus | 'MISSING' | 'all';
  packageId?: string | 'all';
  sort?: AdminUserSort;
  page?: number;
  limit?: number;
};

export type AdminUsersPageFilters = {
  q: string;
  role: UserRole | 'all';
  access: AdminUserAccessFilter;
  status: SubscriptionStatus | 'MISSING' | 'all';
  packageId: string | 'all';
  sort: AdminUserSort;
  page: number;
  limit: number;
};

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  subscription: {
    source: 'SELF_SERVICE' | 'ADMIN_GRANT';
    status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED';
    interval: SubscriptionInterval | null;
    currentPeriodEnd: string | null;
    package: { id: string; name: string } | null;
  } | null;
};

export type AdminUsersPageResult = {
  users: AdminUserRow[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  filters: AdminUsersPageFilters;
  stats: {
    totalUsers: number;
    admins: number;
    withAccess: number;
    noAccess: number;
  };
};

export type AdminSubscriptionPackageRow = SubscriptionPackageRow & {
  createdAt: string;
  updatedAt: string;
  subscriptionCount: number;
};

function serializeUser(user: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  subscription: {
    source: 'SELF_SERVICE' | 'ADMIN_GRANT';
    status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED';
    interval: SubscriptionInterval | null;
    currentPeriodEnd: Date | null;
    package: { id: string; name: string } | null;
  } | null;
}): AdminUserRow {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    subscription: user.subscription
      ? {
          ...user.subscription,
          currentPeriodEnd: user.subscription.currentPeriodEnd?.toISOString() || null,
        }
      : null,
  };
}

function serializeAdminPackage(pkg: {
  id: string;
  slug: string;
  name: string;
  description: string;
  currency: string;
  price: unknown;
  interval: SubscriptionInterval;
  trialDays: number;
  discountLabel: string | null;
  featureBullets: string[];
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  _count: { subscriptions: number };
}): AdminSubscriptionPackageRow {
  return {
    id: pkg.id,
    slug: pkg.slug,
    name: pkg.name,
    description: pkg.description,
    currency: pkg.currency,
    price: Number(pkg.price),
    interval: pkg.interval,
    trialDays: pkg.trialDays,
    discountLabel: pkg.discountLabel,
    featureBullets: pkg.featureBullets,
    isActive: pkg.isActive,
    isFeatured: pkg.isFeatured,
    sortOrder: pkg.sortOrder,
    createdAt: pkg.createdAt.toISOString(),
    updatedAt: pkg.updatedAt.toISOString(),
    subscriptionCount: pkg._count.subscriptions,
  };
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeAdminUsersQuery(query: AdminUsersQuery = {}): AdminUsersPageFilters {
  const page = Number.isInteger(query.page) && query.page && query.page > 0 ? query.page : 1;
  const limit = Number.isInteger(query.limit) && query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
  const role: UserRole | 'all' = query.role === 'ADMIN' || query.role === 'USER' ? query.role : 'all';
  const access = query.access === 'admin' || query.access === 'subscribed' || query.access === 'no_access' ? query.access : 'all';
  const statusValues: Array<SubscriptionStatus | 'MISSING'> = ['ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'MISSING'];
  const status = query.status && statusValues.includes(query.status as SubscriptionStatus | 'MISSING') ? query.status : 'all';
  const sortValues: AdminUserSort[] = ['createdAt_desc', 'createdAt_asc', 'name_asc', 'email_asc'];
  const sort = query.sort && sortValues.includes(query.sort) ? query.sort : 'createdAt_desc';
  const packageId = query.packageId && query.packageId !== 'all' ? query.packageId : 'all';

  return {
    q: (query.q || '').trim(),
    role,
    access,
    status,
    packageId,
    sort,
    page,
    limit,
  };
}

function buildAdminUsersWhere(filters: ReturnType<typeof normalizeAdminUsersQuery>): Prisma.UserWhereInput {
  const and: Prisma.UserWhereInput[] = [];

  if (filters.q) {
    and.push({
      OR: [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { email: { contains: filters.q, mode: 'insensitive' } },
      ],
    });
  }

  if (filters.role !== 'all') {
    and.push({ role: filters.role });
  }

  if (filters.access === 'admin') {
    and.push({ role: 'ADMIN' });
  } else if (filters.access === 'subscribed') {
    and.push({ subscription: { isNot: null } });
  } else if (filters.access === 'no_access') {
    and.push({ role: 'USER', subscription: { is: null } });
  }

  if (filters.status === 'MISSING') {
    and.push({ role: 'USER', subscription: { is: null } });
  } else if (filters.status !== 'all') {
    and.push({ subscription: { is: { status: filters.status } } });
  }

  if (filters.packageId !== 'all') {
    and.push({ subscription: { is: { packageId: filters.packageId } } });
  }

  return and.length > 0 ? { AND: and } : {};
}

function buildAdminUsersOrderBy(sort: AdminUserSort): Prisma.UserOrderByWithRelationInput[] {
  if (sort === 'createdAt_asc') return [{ createdAt: 'asc' }];
  if (sort === 'name_asc') return [{ name: 'asc' }, { createdAt: 'desc' }];
  if (sort === 'email_asc') return [{ email: 'asc' }, { createdAt: 'desc' }];
  return [{ createdAt: 'desc' }];
}

function parsePackageFormData(formData: FormData): ActionResponse<{
  slug: string;
  name: string;
  description: string;
  currency: string;
  price: number;
  interval: SubscriptionInterval;
  trialDays: number;
  discountLabel: string | null;
  featureBullets: string[];
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
}> {
  const name = String(formData.get('name') || '').trim();
  const slug = slugify(String(formData.get('slug') || name));
  const description = String(formData.get('description') || '').trim();
  const currency = String(formData.get('currency') || 'BDT').trim().toUpperCase();
  const price = Number(formData.get('price'));
  const interval = String(formData.get('interval') || '') as SubscriptionInterval;
  const trialDays = Number(formData.get('trialDays') || 0);
  const discountLabel = String(formData.get('discountLabel') || '').trim() || null;
  const featureBullets = String(formData.get('featureBullets') || '')
    .split(/\r?\n/)
    .map((bullet) => bullet.trim())
    .filter(Boolean);
  const sortOrder = Number(formData.get('sortOrder') || 0);

  if (!name) return { success: false, message: 'Package name is required' };
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { success: false, message: 'Package slug is invalid' };
  if (!description) return { success: false, message: 'Package description is required' };
  if (!currency || currency.length > 12) return { success: false, message: 'Currency is invalid' };
  if (!Number.isFinite(price) || price <= 0) return { success: false, message: 'Price must be greater than zero' };
  if (interval !== 'MONTHLY' && interval !== 'YEARLY') return { success: false, message: 'Interval is invalid' };
  if (!Number.isInteger(trialDays) || trialDays < 0) return { success: false, message: 'Trial days must be zero or greater' };
  if (!Number.isInteger(sortOrder)) return { success: false, message: 'Sort order must be a whole number' };

  return {
    success: true,
    message: 'Package data is valid',
    data: {
      slug,
      name,
      description,
      currency,
      price,
      interval,
      trialDays,
      discountLabel,
      featureBullets,
      isActive: formData.get('isActive') === 'on',
      isFeatured: formData.get('isFeatured') === 'on',
      sortOrder,
    },
  };
}

export async function getAdminUsersAction(): Promise<AdminUserRow[]> {
  await requireRole('ADMIN');

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      subscription: {
        select: {
          source: true,
          status: true,
          interval: true,
          currentPeriodEnd: true,
          package: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return users.map(serializeUser);
}

export async function getAdminUsersPageAction(query: AdminUsersQuery = {}): Promise<AdminUsersPageResult> {
  await requireRole('ADMIN');

  const filters = normalizeAdminUsersQuery(query);
  const where = buildAdminUsersWhere(filters);
  const orderBy = buildAdminUsersOrderBy(filters.sort);

  const [total, totalUsers, admins, withAccess, noAccess] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.count(),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({
      where: {
        OR: [
          { role: 'ADMIN' },
          { subscription: { isNot: null } },
        ],
      },
    }),
    prisma.user.count({ where: { role: 'USER', subscription: { is: null } } }),
  ]);

  const pages = Math.max(1, Math.ceil(total / filters.limit));
  const page = Math.min(filters.page, pages);
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      subscription: {
        select: {
          source: true,
          status: true,
          interval: true,
          currentPeriodEnd: true,
          package: {
            select: { id: true, name: true },
          },
        },
      },
    },
    where,
    orderBy,
    skip: (page - 1) * filters.limit,
    take: filters.limit,
  });

  return {
    users: users.map(serializeUser),
    total,
    page,
    limit: filters.limit,
    pages,
    filters,
    stats: {
      totalUsers,
      admins,
      withAccess,
      noAccess,
    },
  };
}

export async function getAdminSubscriptionPackagesAction(): Promise<AdminSubscriptionPackageRow[]> {
  await requireRole('ADMIN');

  const packages = await prisma.subscriptionPackage.findMany({
    orderBy: [{ sortOrder: 'asc' }, { isFeatured: 'desc' }, { createdAt: 'asc' }],
    include: {
      _count: {
        select: { subscriptions: true },
      },
    },
  });

  return packages.map(serializeAdminPackage);
}

export async function createSubscriptionPackageAction(formData: FormData): Promise<ActionResponse> {
  await requireRole('ADMIN');

  const parsed = parsePackageFormData(formData);
  if (!parsed.success || !parsed.data) return { success: false, message: parsed.message };

  try {
    await prisma.subscriptionPackage.create({ data: parsed.data });
    revalidatePath('/admin/subscriptions');
    revalidatePath('/subscription');
    revalidatePath('/settings');
    return { success: true, message: `${parsed.data.name} created` };
  } catch {
    return { success: false, message: 'Failed to create package. Check that the slug is unique.' };
  }
}

export async function updateSubscriptionPackageAction(packageId: string, formData: FormData): Promise<ActionResponse> {
  await requireRole('ADMIN');

  const parsed = parsePackageFormData(formData);
  if (!parsed.success || !parsed.data) return { success: false, message: parsed.message };

  try {
    await prisma.subscriptionPackage.update({
      where: { id: packageId },
      data: parsed.data,
    });
    revalidatePath('/admin/subscriptions');
    revalidatePath('/subscription');
    revalidatePath('/settings');
    return { success: true, message: `${parsed.data.name} updated` };
  } catch {
    return { success: false, message: 'Failed to update package. Check that the slug is unique.' };
  }
}

export async function setSubscriptionPackageActiveAction(packageId: string, isActive: boolean): Promise<ActionResponse> {
  await requireRole('ADMIN');

  const pkg = await prisma.subscriptionPackage.update({
    where: { id: packageId },
    data: { isActive },
  });

  revalidatePath('/admin/subscriptions');
  revalidatePath('/subscription');
  revalidatePath('/settings');
  return { success: true, message: `${pkg.name} ${isActive ? 'activated' : 'deactivated'}` };
}

export async function updateUserRoleAction(userId: string, role: UserRole): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' };
  await requireRole('ADMIN');

  if (role !== 'ADMIN' && role !== 'USER') {
    return { success: false, message: 'Invalid role' };
  }

  if (userId === session.user.id && role !== 'ADMIN') {
    return { success: false, message: 'You cannot remove your own admin role.' };
  }

  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!targetUser) return { success: false, message: 'User not found' };
  if (targetUser.role === 'ADMIN' && role !== 'ADMIN' && adminCount <= 1) {
    return { success: false, message: 'At least one admin is required.' };
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath('/admin/users');
  return { success: true, message: 'User role updated' };
}

export async function grantUserAccessAction(formData: FormData): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' };
  await requireRole('ADMIN');

  const email = String(formData.get('email') || '').trim().toLowerCase();
  const duration = String(formData.get('duration') || '');
  const packageId = String(formData.get('packageId') || '').trim() || null;
  if (!email) return { success: false, message: 'User email is required' };
  if (!['MONTHLY', 'YEARLY', 'UNLIMITED'].includes(duration)) {
    return { success: false, message: 'Invalid grant duration' };
  }

  const targetUser = await prisma.user.findUnique({ where: { email } });
  if (!targetUser) return { success: false, message: 'User not found' };

  const now = new Date();
  let currentPeriodEnd: Date | null = null;
  let interval: SubscriptionInterval | null = null;
  let grantedPackageId: string | null = null;

  const subscriptionPackage = packageId && duration !== 'UNLIMITED'
    ? await prisma.subscriptionPackage.findFirst({ where: { id: packageId, isActive: true } })
    : null;

  if (packageId && duration !== 'UNLIMITED' && !subscriptionPackage) {
    return { success: false, message: 'Subscription package is not available' };
  }

  if (subscriptionPackage) {
    interval = subscriptionPackage.interval;
    grantedPackageId = subscriptionPackage.id;
    currentPeriodEnd = new Date(now);
    if (subscriptionPackage.interval === 'YEARLY') {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    } else {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    }
  } else if (duration === 'MONTHLY') {
    currentPeriodEnd = new Date(now);
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    interval = 'MONTHLY';
  } else if (duration === 'YEARLY') {
    currentPeriodEnd = new Date(now);
    currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    interval = 'YEARLY';
  }

  await prisma.userSubscription.upsert({
    where: { userId: targetUser.id },
    update: {
      packageId: grantedPackageId,
      plan: 'PRO',
      interval,
      source: 'ADMIN_GRANT',
      status: 'ACTIVE',
      currentPeriodStart: now,
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
      grantedById: session.user.id,
    },
    create: {
      userId: targetUser.id,
      packageId: grantedPackageId,
      plan: 'PRO',
      interval,
      source: 'ADMIN_GRANT',
      status: 'ACTIVE',
      currentPeriodStart: now,
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
      grantedById: session.user.id,
    },
  });

  revalidatePath('/admin/subscriptions');
  return {
    success: true,
    message: currentPeriodEnd
      ? `Full access granted to ${targetUser.email} until ${currentPeriodEnd.toLocaleDateString()}`
      : `Unlimited full access granted to ${targetUser.email}`,
  };
}

export async function revokeUserAccessAction(userId: string): Promise<ActionResponse> {
  await requireRole('ADMIN');

  const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true } });
  if (!targetUser) return { success: false, message: 'User not found' };
  if (targetUser.role === 'ADMIN') return { success: false, message: 'Admin access cannot be revoked here.' };

  await prisma.userSubscription.deleteMany({ where: { userId } });
  revalidatePath('/admin/subscriptions');
  return { success: true, message: `Access revoked for ${targetUser.email}` };
}
