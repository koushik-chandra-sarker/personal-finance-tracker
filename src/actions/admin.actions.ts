'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/rbac';
import type { ActionResponse } from '@/types';
import type { ManualPaymentProvider, ManualPaymentStatus, Prisma, SubscriptionInterval, SubscriptionSource, SubscriptionStatus, UserRole, UserStatus } from '@prisma/client';
import type { SubscriptionPackageRow } from '@/actions/settings.actions';
import { createHash, randomBytes } from 'crypto';

export type AdminUserAccessFilter = 'all' | 'admin' | 'subscribed' | 'no_access';
export type AdminUserSort = 'createdAt_desc' | 'createdAt_asc' | 'name_asc' | 'email_asc';

export type AdminUsersQuery = {
  q?: string;
  role?: UserRole | 'all';
  accountStatus?: UserStatus | 'all';
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
  accountStatus: UserStatus | 'all';
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
  phoneNumber: string | null;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
  lockedUntil: string | null;
  createdAt: string;
  subscription: {
    source: 'SELF_SERVICE' | 'ADMIN_GRANT';
    status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED';
    interval: SubscriptionInterval | null;
    currentPeriodEnd: string | null;
    package: { id: string; name: string } | null;
  } | null;
  deletionRecord: {
    originalName: string;
    originalEmail: string;
    deletionType: 'USER_SELF' | 'ADMIN_SOFT' | 'ADMIN_PERMANENT';
    performedByName: string | null;
    performedByEmail: string | null;
    createdAt: string;
  } | null;
};

export type AdminUsersPageResult = {
  users: AdminUserRow[];
  deletionRecords: AdminAccountDeletionRecordRow[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  filters: AdminUsersPageFilters;
  stats: {
    totalUsers: number;
    active: number;
    admins: number;
    suspended: number;
    withAccess: number;
    noAccess: number;
  };
};

export type AdminAccountDeletionRecordRow = {
  id: string;
  deletedUserId: string | null;
  originalName: string;
  originalEmail: string;
  originalRole: UserRole;
  deletionType: 'USER_SELF' | 'ADMIN_SOFT' | 'ADMIN_PERMANENT';
  anonymizedEmail: string | null;
  performedByName: string | null;
  performedByEmail: string | null;
  note: string | null;
  createdAt: string;
};

export type AdminSubscriptionPackageRow = SubscriptionPackageRow & {
  createdAt: string;
  updatedAt: string;
  subscriptionCount: number;
};

export type AdminManualPaymentMethodRow = {
  id: string;
  provider: ManualPaymentProvider;
  label: string;
  accountNumber: string;
  accountName: string;
  instructions: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  requestCount: number;
};

export type AdminManualPaymentRequestRow = {
  id: string;
  provider: ManualPaymentProvider;
  status: ManualPaymentStatus;
  amount: number;
  currency: string;
  reference: string;
  senderAccount: string;
  transactionId: string;
  paidAt: string | null;
  screenshotUrl: string | null;
  note: string | null;
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string | null;
  };
  package: {
    id: string;
    name: string;
    interval: SubscriptionInterval;
  };
  method: {
    id: string;
    label: string;
    accountNumber: string;
    accountName: string;
  } | null;
  reviewedBy: {
    name: string;
    email: string;
  } | null;
};

export type AdminInviteResult = {
  email: string;
  inviteUrl: string;
  expiresAt: string;
};

export type AdminCreateUserResult = {
  name: string;
  email: string;
  role: UserRole;
  packageName: string | null;
  temporaryPassword: string;
  mustChangePassword: boolean;
};

export type AdminUserInviteStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED';

export type AdminUserInviteRow = {
  id: string;
  email: string;
  role: UserRole;
  status: AdminUserInviteStatus;
  package: { id: string; name: string } | null;
  invitedBy: { name: string; email: string } | null;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
};

export type AdminAnalyticsMetric = {
  label: string;
  value: number;
  helper: string;
  tone: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet';
};

export type AdminAnalyticsTrendPoint = {
  label: string;
  users: number;
  subscriptions: number;
  transactions: number;
  visits: number;
};

export type AdminAnalyticsPackagePoint = {
  id: string;
  name: string;
  currency: string;
  interval: SubscriptionInterval;
  price: number;
  subscriptions: number;
  monthlyValue: number;
};

export type AdminAnalyticsRecentUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLoginAt: string | null;
  subscription: {
    status: SubscriptionStatus;
    source: SubscriptionSource;
    packageName: string | null;
  } | null;
};

export type AdminAnalyticsRouteView = {
  path: string;
  views: number;
};

export type AdminAnalyticsBreakdownPoint = {
  label: string;
  value: number;
};

export type AdminAnalyticsRecentPageView = {
  id: string;
  path: string;
  referrer: string | null;
  deviceType: string | null;
  browser: string | null;
  createdAt: string;
  user: {
    name: string;
    email: string;
  } | null;
};

export type AdminAnalyticsActiveUser = {
  id: string;
  name: string;
  email: string;
  currentPath: string;
  deviceType: string | null;
  browser: string | null;
  lastSeenAt: string;
};

export type AdminAnalyticsResult = {
  generatedAt: string;
  metrics: AdminAnalyticsMetric[];
  access: {
    activeSubscriptions: number;
    trialingSubscriptions: number;
    pastDueSubscriptions: number;
    canceledSubscriptions: number;
    adminGranted: number;
    selfService: number;
    withoutAccess: number;
  };
  finance: {
    last30DaysIncome: number;
    last30DaysExpense: number;
    last30DaysTransactions: number;
    totalAccountBalance: number;
    totalInvestedValue: number;
  };
  estimatedRevenue: {
    currency: string;
    monthlyRecurringValue: number;
    annualRecurringValue: number;
  };
  siteVisits: {
    totalViews: number;
    viewsToday: number;
    viewsLast30Days: number;
    uniqueVisitorsLast30Days: number;
    uniqueVisitorsToday: number;
    loggedInViewsLast30Days: number;
    anonymousViewsLast30Days: number;
    topRoutes: AdminAnalyticsRouteView[];
    deviceBreakdown: AdminAnalyticsBreakdownPoint[];
    browserBreakdown: AdminAnalyticsBreakdownPoint[];
    recentViews: AdminAnalyticsRecentPageView[];
  };
  liveActivity: {
    onlineUsersNow: number;
    activeSessionsNow: number;
    activeUsersToday: number;
    activeUsersThisWeek: number;
    activeRoutes: AdminAnalyticsRouteView[];
    recentActiveUsers: AdminAnalyticsActiveUser[];
  };
  trends: AdminAnalyticsTrendPoint[];
  packageMix: AdminAnalyticsPackagePoint[];
  recentUsers: AdminAnalyticsRecentUser[];
};

function hashInviteToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function normalizePhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('880')) return `+${digits}`;
  if (digits.startsWith('0')) return `+88${digits}`;
  if (digits.startsWith('1')) return `+880${digits}`;
  return value.trim();
}

function serializeUser(user: {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: Date | null;
  mustChangePassword: boolean;
  lockedUntil: Date | null;
  createdAt: Date;
  subscription: {
    source: 'SELF_SERVICE' | 'ADMIN_GRANT';
    status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED';
    interval: SubscriptionInterval | null;
    currentPeriodEnd: Date | null;
    package: { id: string; name: string } | null;
  } | null;
  deletionRecord?: {
    originalName: string;
    originalEmail: string;
    deletionType: 'USER_SELF' | 'ADMIN_SOFT' | 'ADMIN_PERMANENT';
    performedByName: string | null;
    performedByEmail: string | null;
    createdAt: Date;
  } | null;
}): AdminUserRow {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() || null,
    lockedUntil: user.lockedUntil?.toISOString() || null,
    subscription: user.subscription
      ? {
          ...user.subscription,
          currentPeriodEnd: user.subscription.currentPeriodEnd?.toISOString() || null,
        }
      : null,
    deletionRecord: user.deletionRecord
      ? {
          ...user.deletionRecord,
          createdAt: user.deletionRecord.createdAt.toISOString(),
        }
      : null,
  };
}

function serializeAccountDeletionRecord(record: {
  id: string;
  deletedUserId: string | null;
  originalName: string;
  originalEmail: string;
  originalRole: UserRole;
  deletionType: 'USER_SELF' | 'ADMIN_SOFT' | 'ADMIN_PERMANENT';
  anonymizedEmail: string | null;
  performedByName: string | null;
  performedByEmail: string | null;
  note: string | null;
  createdAt: Date;
}): AdminAccountDeletionRecordRow {
  return {
    ...record,
    createdAt: record.createdAt.toISOString(),
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

function serializeAdminManualPaymentMethod(method: {
  id: string;
  provider: ManualPaymentProvider;
  label: string;
  accountNumber: string;
  accountName: string;
  instructions: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  _count: { requests: number };
}): AdminManualPaymentMethodRow {
  return {
    id: method.id,
    provider: method.provider,
    label: method.label,
    accountNumber: method.accountNumber,
    accountName: method.accountName,
    instructions: method.instructions,
    isActive: method.isActive,
    sortOrder: method.sortOrder,
    createdAt: method.createdAt.toISOString(),
    requestCount: method._count.requests,
  };
}

function serializeAdminManualPaymentRequest(request: {
  id: string;
  provider: ManualPaymentProvider;
  status: ManualPaymentStatus;
  amount: unknown;
  currency: string;
  reference: string;
  senderAccount: string;
  transactionId: string;
  paidAt: Date | null;
  screenshotUrl: string | null;
  note: string | null;
  adminNote: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  user: { id: string; name: string; email: string; phoneNumber: string | null };
  package: { id: string; name: string; interval: SubscriptionInterval };
  method: { id: string; label: string; accountNumber: string; accountName: string } | null;
  reviewedBy: { name: string; email: string } | null;
}): AdminManualPaymentRequestRow {
  return {
    ...request,
    amount: Number(request.amount),
    paidAt: request.paidAt?.toISOString() || null,
    createdAt: request.createdAt.toISOString(),
    reviewedAt: request.reviewedAt?.toISOString() || null,
  };
}

function serializeAdminInvite(invite: {
  id: string;
  email: string;
  role: UserRole;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
  package: { id: string; name: string } | null;
  invitedBy: { name: string; email: string } | null;
}): AdminUserInviteRow {
  const status: AdminUserInviteStatus = invite.acceptedAt
    ? 'ACCEPTED'
    : invite.expiresAt < new Date()
      ? 'EXPIRED'
      : 'PENDING';

  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    status,
    package: invite.package,
    invitedBy: invite.invitedBy,
    expiresAt: invite.expiresAt.toISOString(),
    acceptedAt: invite.acceptedAt?.toISOString() || null,
    createdAt: invite.createdAt.toISOString(),
  };
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function dayStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short' });
}

function decimalToNumber(value: unknown) {
  return value === null || value === undefined ? 0 : Number(value);
}

function monthlyPackageValue(pkg: {
  price: unknown;
  interval: SubscriptionInterval;
}) {
  const price = decimalToNumber(pkg.price);
  return pkg.interval === 'YEARLY' ? price / 12 : price;
}

function toBreakdownPoint(label: string | null, value: number): AdminAnalyticsBreakdownPoint {
  return {
    label: label || 'Unknown',
    value,
  };
}

function normalizeAdminUsersQuery(query: AdminUsersQuery = {}): AdminUsersPageFilters {
  const page = Number.isInteger(query.page) && query.page && query.page > 0 ? query.page : 1;
  const limit = Number.isInteger(query.limit) && query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
  const role: UserRole | 'all' = query.role === 'ADMIN' || query.role === 'USER' ? query.role : 'all';
  const accountStatusValues: UserStatus[] = ['ACTIVE', 'SUSPENDED', 'INVITED', 'DELETED'];
  const accountStatus = query.accountStatus && accountStatusValues.includes(query.accountStatus as UserStatus) ? query.accountStatus : 'all';
  const access = query.access === 'admin' || query.access === 'subscribed' || query.access === 'no_access' ? query.access : 'all';
  const statusValues: Array<SubscriptionStatus | 'MISSING'> = ['ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'MISSING'];
  const status = query.status && statusValues.includes(query.status as SubscriptionStatus | 'MISSING') ? query.status : 'all';
  const sortValues: AdminUserSort[] = ['createdAt_desc', 'createdAt_asc', 'name_asc', 'email_asc'];
  const sort = query.sort && sortValues.includes(query.sort) ? query.sort : 'createdAt_desc';
  const packageId = query.packageId && query.packageId !== 'all' ? query.packageId : 'all';

  return {
    q: (query.q || '').trim(),
    role,
    accountStatus,
    access,
    status,
    packageId,
    sort,
    page,
    limit,
  };
}

function buildAdminUsersWhere(filters: ReturnType<typeof normalizeAdminUsersQuery>, deletionMatchedUserIds: string[] = []): Prisma.UserWhereInput {
  const and: Prisma.UserWhereInput[] = [];

  if (filters.q) {
    and.push({
      OR: [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { email: { contains: filters.q, mode: 'insensitive' } },
        ...(deletionMatchedUserIds.length > 0 ? [{ id: { in: deletionMatchedUserIds } }] : []),
      ],
    });
  }

  if (filters.role !== 'all') {
    and.push({ role: filters.role });
  }

  if (filters.accountStatus !== 'all') {
    and.push({ status: filters.accountStatus });
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
  const isTrial = formData.get('isTrial') === 'on';
  const trialDays = Number(formData.get('trialDays') || 0);
  const name = String(formData.get('name') || (isTrial ? 'Pro Trial' : '')).trim();
  const slug = slugify(String(formData.get('slug') || name));
  const description = String(formData.get('description') || (isTrial ? 'Try full Pro access before choosing a paid package.' : '')).trim();
  const currency = String(formData.get('currency') || 'BDT').trim().toUpperCase();
  const price = isTrial ? 0 : Number(formData.get('price'));
  const interval = (isTrial ? 'MONTHLY' : String(formData.get('interval') || '')) as SubscriptionInterval;
  const discountLabel = String(formData.get('discountLabel') || (isTrial ? 'No payment required' : '')).trim() || null;
  const featureBulletsRaw = String(formData.get('featureBullets') || (
    isTrial
      ? 'Full dashboard access during trial\nNo bKash or Nagad payment needed\nChoose a paid package after trial ends'
      : ''
  ));
  const featureBullets = featureBulletsRaw
    .split(/\r?\n/)
    .map((bullet) => bullet.trim())
    .filter(Boolean);
  const sortOrder = Number(formData.get('sortOrder') || (isTrial ? 5 : 0));

  if (!name) return { success: false, message: 'প্যাকেজের নাম প্রয়োজন' };
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { success: false, message: 'প্যাকেজ স্লাগ সঠিক নয়' };
  if (!description) return { success: false, message: 'প্যাকেজ বিবরণ প্রয়োজন' };
  if (!currency || currency.length > 12) return { success: false, message: 'কারেন্সি সঠিক নয়' };
  if (interval !== 'MONTHLY' && interval !== 'YEARLY') return { success: false, message: 'ইন্টারভ্যাল সঠিক নয়' };
  if (!Number.isInteger(trialDays) || trialDays < 0) return { success: false, message: 'ট্রায়াল দিন শূন্য বা তার বেশি হতে হবে' };
  if (isTrial && trialDays <= 0) return { success: false, message: 'ট্রায়াল প্যাকেজের জন্য ট্রায়াল দিন দিতে হবে' };
  if (!Number.isFinite(price) || price < 0) return { success: false, message: 'মূল্য শূন্য বা তার বেশি হতে হবে' };
  if (!isTrial && price <= 0) return { success: false, message: 'পেইড প্যাকেজের মূল্য শূন্যের বেশি হতে হবে' };
  if (!isTrial && trialDays > 0) return { success: false, message: 'পেইড প্যাকেজে ট্রায়াল দিন ব্যবহার করবেন না। আলাদা ফ্রি ট্রায়াল প্যাকেজ তৈরি করুন' };
  if (!Number.isInteger(sortOrder)) return { success: false, message: 'সোর্ট অর্ডার পূর্ণ সংখ্যা হতে হবে' };

  return {
    success: true,
    message: 'প্যাকেজ তথ্য সঠিক',
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
      isFeatured: !isTrial && formData.get('isFeatured') === 'on',
      sortOrder,
    },
  };
}

function parseManualPaymentMethodFormData(formData: FormData): ActionResponse<{
  provider: ManualPaymentProvider;
  label: string;
  accountNumber: string;
  accountName: string;
  instructions: string | null;
  isActive: boolean;
  sortOrder: number;
}> {
  const provider = String(formData.get('provider') || '') as ManualPaymentProvider;
  const label = String(formData.get('label') || '').trim();
  const accountNumber = String(formData.get('accountNumber') || '').trim();
  const accountName = String(formData.get('accountName') || '').trim();
  const instructions = String(formData.get('instructions') || '').trim() || null;
  const sortOrder = Number(formData.get('sortOrder') || 0);

  if (provider !== 'BKASH' && provider !== 'NAGAD') return { success: false, message: 'পেমেন্ট প্রোভাইডার সঠিক নয়' };
  if (!label || label.length > 80) return { success: false, message: 'অ্যাকাউন্ট লেবেল প্রয়োজন' };
  if (!accountNumber || accountNumber.length < 8 || accountNumber.length > 24) return { success: false, message: 'অ্যাকাউন্ট নম্বর সঠিক নয়' };
  if (!accountName || accountName.length > 80) return { success: false, message: 'অ্যাকাউন্টের নাম প্রয়োজন' };
  if (instructions && instructions.length > 500) return { success: false, message: 'নির্দেশনা ৫০০ অক্ষরের মধ্যে হতে হবে' };
  if (!Number.isInteger(sortOrder)) return { success: false, message: 'সোর্ট অর্ডার পূর্ণ সংখ্যা হতে হবে' };

  return {
    success: true,
    message: 'পেমেন্ট অ্যাকাউন্ট তথ্য সঠিক',
    data: {
      provider,
      label,
      accountNumber,
      accountName,
      instructions,
      isActive: formData.get('isActive') === 'on',
      sortOrder,
    },
  };
}

function addSubscriptionInterval(date: Date, interval: SubscriptionInterval) {
  const next = new Date(date);
  if (interval === 'YEARLY') {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

export async function getAdminUsersAction(): Promise<AdminUserRow[]> {
  await requireRole('ADMIN');

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
      status: true,
      lastLoginAt: true,
      mustChangePassword: true,
      lockedUntil: true,
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

  const deletionRecords = await prisma.accountDeletionRecord.findMany({
    where: { deletedUserId: { in: users.map((user) => user.id) } },
    orderBy: { createdAt: 'desc' },
  });
  const deletionRecordByUserId = new Map<string, (typeof deletionRecords)[number]>();
  deletionRecords.forEach((record) => {
    if (record.deletedUserId && !deletionRecordByUserId.has(record.deletedUserId)) {
      deletionRecordByUserId.set(record.deletedUserId, record);
    }
  });

  return users.map((user) => serializeUser({
    ...user,
    deletionRecord: deletionRecordByUserId.get(user.id) || null,
  }));
}

export async function getAdminUsersPageAction(query: AdminUsersQuery = {}): Promise<AdminUsersPageResult> {
  await requireRole('ADMIN');

  const filters = normalizeAdminUsersQuery(query);
  const deletionMatches = filters.q
    ? await prisma.accountDeletionRecord.findMany({
        where: {
          OR: [
            { originalName: { contains: filters.q, mode: 'insensitive' } },
            { originalEmail: { contains: filters.q, mode: 'insensitive' } },
          ],
          deletedUserId: { not: null },
        },
        select: { deletedUserId: true },
        take: 100,
      })
    : [];
  const deletionMatchedUserIds = deletionMatches
    .map((record) => record.deletedUserId)
    .filter((id): id is string => Boolean(id));
  const where = buildAdminUsersWhere(filters, deletionMatchedUserIds);
  const orderBy = buildAdminUsersOrderBy(filters.sort);

  const [total, totalUsers, active, admins, suspended, withAccess, noAccess] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.count(),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: { status: 'SUSPENDED' } }),
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
      phoneNumber: true,
      role: true,
      status: true,
      lastLoginAt: true,
      mustChangePassword: true,
      lockedUntil: true,
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
  const deletionRecords = await prisma.accountDeletionRecord.findMany({
    where: { deletedUserId: { in: users.map((user) => user.id) } },
    orderBy: { createdAt: 'desc' },
  });
  const recentDeletionRecords = await prisma.accountDeletionRecord.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  const deletionRecordByUserId = new Map<string, (typeof deletionRecords)[number]>();
  deletionRecords.forEach((record) => {
    if (record.deletedUserId && !deletionRecordByUserId.has(record.deletedUserId)) {
      deletionRecordByUserId.set(record.deletedUserId, record);
    }
  });

  return {
    users: users.map((user) => serializeUser({
      ...user,
      deletionRecord: deletionRecordByUserId.get(user.id) || null,
    })),
    deletionRecords: recentDeletionRecords.map(serializeAccountDeletionRecord),
    total,
    page,
    limit: filters.limit,
    pages,
    filters,
    stats: {
      totalUsers,
      active,
      admins,
      suspended,
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

export async function getAdminManualPaymentMethodsAction(): Promise<AdminManualPaymentMethodRow[]> {
  await requireRole('ADMIN');

  const methods = await prisma.manualPaymentMethod.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      _count: {
        select: { requests: true },
      },
    },
  });

  return methods.map(serializeAdminManualPaymentMethod);
}

export async function getAdminManualPaymentRequestsAction(): Promise<AdminManualPaymentRequestRow[]> {
  await requireRole('ADMIN');

  const requests = await prisma.manualPaymentRequest.findMany({
    select: {
      id: true,
      provider: true,
      status: true,
      amount: true,
      currency: true,
      reference: true,
      senderAccount: true,
      transactionId: true,
      paidAt: true,
      screenshotUrl: true,
      note: true,
      adminNote: true,
      createdAt: true,
      reviewedAt: true,
      user: {
        select: { id: true, name: true, email: true, phoneNumber: true },
      },
      package: {
        select: { id: true, name: true, interval: true },
      },
      method: {
        select: { id: true, label: true, accountNumber: true, accountName: true },
      },
      reviewedBy: {
        select: { name: true, email: true },
      },
    },
    orderBy: [
      { status: 'asc' },
      { createdAt: 'desc' },
    ],
    take: 50,
  });

  return requests.map(serializeAdminManualPaymentRequest);
}

export async function getAdminUserInvitesAction(): Promise<AdminUserInviteRow[]> {
  await requireRole('ADMIN');

  const invites = await prisma.userInvite.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
      createdAt: true,
      package: {
        select: { id: true, name: true },
      },
      invitedBy: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return invites.map(serializeAdminInvite);
}

export async function getAdminAnalyticsAction(): Promise<AdminAnalyticsResult> {
  await requireRole('ADMIN');

  const now = new Date();
  const last30Days = new Date(now);
  last30Days.setDate(now.getDate() - 30);
  const previous30Days = new Date(now);
  previous30Days.setDate(now.getDate() - 60);
  const today = dayStart(now);
  const onlineSince = new Date(now);
  onlineSince.setMinutes(now.getMinutes() - 5);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  const activeSubscriptionWhere: Prisma.UserSubscriptionWhereInput = {
    status: { in: ['ACTIVE', 'TRIALING'] },
    OR: [
      { currentPeriodEnd: null },
      { currentPeriodEnd: { gte: now } },
    ],
  };

  const withoutAccessWhere: Prisma.UserWhereInput = {
    role: 'USER',
    OR: [
      { subscription: { is: null } },
      { subscription: { is: { status: { in: ['PAST_DUE', 'CANCELED'] } } } },
      { subscription: { is: { currentPeriodEnd: { lt: now } } } },
    ],
  };

  const [
    totalUsers,
    activeUsers,
    admins,
    suspendedUsers,
    newUsers30,
    newUsersPrevious30,
    activeSubscriptions,
    trialingSubscriptions,
    pastDueSubscriptions,
    canceledSubscriptions,
    adminGranted,
    selfService,
    withoutAccess,
    last30DaysIncome,
    last30DaysExpense,
    last30DaysTransactions,
    totalAccountBalance,
    totalInvestedValue,
    totalPageViews,
    viewsToday,
    viewsLast30Days,
    loggedInViewsLast30Days,
    anonymousViewsLast30Days,
    uniqueVisitorsLast30Days,
    uniqueVisitorsToday,
    pageViewsForBreakdown,
    recentViews,
    activeSessionsNow,
    onlineUsersNowRows,
    activeUsersTodayRows,
    activeUsersThisWeekRows,
    activeActivityRows,
    recentActivityRows,
    activeSubscriptionsForRevenue,
    packages,
    recentUsers,
  ] = await prisma.$transaction([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: { status: 'SUSPENDED' } }),
    prisma.user.count({ where: { createdAt: { gte: last30Days } } }),
    prisma.user.count({ where: { createdAt: { gte: previous30Days, lt: last30Days } } }),
    prisma.userSubscription.count({ where: { status: 'ACTIVE' } }),
    prisma.userSubscription.count({ where: { status: 'TRIALING' } }),
    prisma.userSubscription.count({ where: { status: 'PAST_DUE' } }),
    prisma.userSubscription.count({ where: { status: 'CANCELED' } }),
    prisma.userSubscription.count({ where: { source: 'ADMIN_GRANT' } }),
    prisma.userSubscription.count({ where: { source: 'SELF_SERVICE' } }),
    prisma.user.count({ where: withoutAccessWhere }),
    prisma.transaction.aggregate({
      where: { type: 'INCOME', date: { gte: last30Days } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { type: 'EXPENSE', date: { gte: last30Days } },
      _sum: { amount: true },
    }),
    prisma.transaction.count({ where: { date: { gte: last30Days } } }),
    prisma.account.aggregate({ _sum: { balance: true } }),
    prisma.investment.aggregate({ _sum: { currentValue: true } }),
    prisma.pageView.count(),
    prisma.pageView.count({ where: { createdAt: { gte: today } } }),
    prisma.pageView.count({ where: { createdAt: { gte: last30Days } } }),
    prisma.pageView.count({ where: { createdAt: { gte: last30Days }, userId: { not: null } } }),
    prisma.pageView.count({ where: { createdAt: { gte: last30Days }, userId: null } }),
    prisma.pageView.findMany({
      where: { createdAt: { gte: last30Days } },
      distinct: ['visitorId'],
      select: { visitorId: true },
    }),
    prisma.pageView.findMany({
      where: { createdAt: { gte: today } },
      distinct: ['visitorId'],
      select: { visitorId: true },
    }),
    prisma.pageView.findMany({
      where: { createdAt: { gte: last30Days } },
      select: {
        path: true,
        deviceType: true,
        browser: true,
      },
    }),
    prisma.pageView.findMany({
      select: {
        id: true,
        path: true,
        referrer: true,
        deviceType: true,
        browser: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.userActivity.count({ where: { lastSeenAt: { gte: onlineSince } } }),
    prisma.userActivity.findMany({
      where: { lastSeenAt: { gte: onlineSince } },
      distinct: ['userId'],
      select: { userId: true },
    }),
    prisma.userActivity.findMany({
      where: { lastSeenAt: { gte: today } },
      distinct: ['userId'],
      select: { userId: true },
    }),
    prisma.userActivity.findMany({
      where: { lastSeenAt: { gte: weekStart } },
      distinct: ['userId'],
      select: { userId: true },
    }),
    prisma.userActivity.findMany({
      where: { lastSeenAt: { gte: onlineSince } },
      select: { currentPath: true },
    }),
    prisma.userActivity.findMany({
      where: { lastSeenAt: { gte: onlineSince } },
      select: {
        id: true,
        currentPath: true,
        deviceType: true,
        browser: true,
        lastSeenAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { lastSeenAt: 'desc' },
      take: 8,
    }),
    prisma.userSubscription.findMany({
      where: activeSubscriptionWhere,
      select: {
        source: true,
        package: {
          select: {
            id: true,
            name: true,
            currency: true,
            price: true,
            interval: true,
          },
        },
      },
    }),
    prisma.subscriptionPackage.findMany({
      select: {
        id: true,
        name: true,
        currency: true,
        price: true,
        interval: true,
        subscriptions: {
          where: activeSubscriptionWhere,
          select: { id: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        subscription: {
          select: {
            status: true,
            source: true,
            package: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ]);

  const monthStarts = Array.from({ length: 6 }, (_, index) => addMonth(monthStart(now), index - 5));
  const trends = await Promise.all(monthStarts.map(async (startDate) => {
    const endDate = addMonth(startDate, 1);
    const [users, subscriptions, transactions, visits] = await prisma.$transaction([
      prisma.user.count({ where: { createdAt: { gte: startDate, lt: endDate } } }),
      prisma.userSubscription.count({ where: { createdAt: { gte: startDate, lt: endDate } } }),
      prisma.transaction.count({ where: { createdAt: { gte: startDate, lt: endDate } } }),
      prisma.pageView.count({ where: { createdAt: { gte: startDate, lt: endDate } } }),
    ]);

    return {
      label: monthLabel(startDate),
      users,
      subscriptions,
      transactions,
      visits,
    };
  }));

  const packageMix = packages.map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    currency: pkg.currency,
    interval: pkg.interval,
    price: decimalToNumber(pkg.price),
    subscriptions: pkg.subscriptions.length,
    monthlyValue: monthlyPackageValue(pkg) * pkg.subscriptions.length,
  }));

  const monthlyRecurringValue = activeSubscriptionsForRevenue.reduce((total, subscription) => {
    return total + (subscription.package ? monthlyPackageValue(subscription.package) : 0);
  }, 0);

  const growthDelta = newUsers30 - newUsersPrevious30;
  const churnRisk = pastDueSubscriptions + canceledSubscriptions;
  const routeCounts = new Map<string, number>();
  const deviceCounts = new Map<string, number>();
  const browserCounts = new Map<string, number>();
  const activeRouteCounts = new Map<string, number>();
  pageViewsForBreakdown.forEach((view) => {
    routeCounts.set(view.path, (routeCounts.get(view.path) || 0) + 1);
    const device = view.deviceType || 'Unknown';
    const browser = view.browser || 'Unknown';
    deviceCounts.set(device, (deviceCounts.get(device) || 0) + 1);
    browserCounts.set(browser, (browserCounts.get(browser) || 0) + 1);
  });
  activeActivityRows.forEach((activity) => {
    activeRouteCounts.set(activity.currentPath, (activeRouteCounts.get(activity.currentPath) || 0) + 1);
  });

  const topRoutes = Array.from(routeCounts.entries())
    .map(([path, views]) => ({ path, views }))
    .sort((left, right) => right.views - left.views)
    .slice(0, 8);
  const deviceBreakdown = Array.from(deviceCounts.entries())
    .map(([label, value]) => toBreakdownPoint(label, value))
    .sort((left, right) => right.value - left.value);
  const browserBreakdown = Array.from(browserCounts.entries())
    .map(([label, value]) => toBreakdownPoint(label, value))
    .sort((left, right) => right.value - left.value);
  const activeRoutes = Array.from(activeRouteCounts.entries())
    .map(([path, views]) => ({ path, views }))
    .sort((left, right) => right.views - left.views)
    .slice(0, 6);

  return {
    generatedAt: now.toISOString(),
    metrics: [
      {
        label: 'Total Users',
        value: totalUsers,
        helper: `${newUsers30} joined in the last 30 days`,
        tone: 'indigo',
      },
      {
        label: 'Active Users',
        value: activeUsers,
        helper: `${admins} admins, ${suspendedUsers} suspended`,
        tone: 'emerald',
      },
      {
        label: 'Active Access',
        value: activeSubscriptions + trialingSubscriptions,
        helper: `${withoutAccess} users currently blocked`,
        tone: 'sky',
      },
      {
        label: 'Growth Delta',
        value: growthDelta,
        helper: 'Compared with the previous 30 days',
        tone: growthDelta >= 0 ? 'violet' : 'rose',
      },
      {
        label: 'Churn Risk',
        value: churnRisk,
        helper: `${pastDueSubscriptions} past due, ${canceledSubscriptions} canceled`,
        tone: churnRisk > 0 ? 'amber' : 'emerald',
      },
      {
        label: '30-Day Transactions',
        value: last30DaysTransactions,
        helper: 'Transactions created across all users',
        tone: 'indigo',
      },
      {
        label: '30-Day Visits',
        value: viewsLast30Days,
        helper: `${uniqueVisitorsLast30Days.length} unique visitors`,
        tone: 'violet',
      },
      {
        label: 'Online Now',
        value: onlineUsersNowRows.length,
        helper: `${activeSessionsNow} active sessions in the last 5 minutes`,
        tone: onlineUsersNowRows.length > 0 ? 'emerald' : 'sky',
      },
    ],
    access: {
      activeSubscriptions,
      trialingSubscriptions,
      pastDueSubscriptions,
      canceledSubscriptions,
      adminGranted,
      selfService,
      withoutAccess,
    },
    finance: {
      last30DaysIncome: decimalToNumber(last30DaysIncome._sum.amount),
      last30DaysExpense: decimalToNumber(last30DaysExpense._sum.amount),
      last30DaysTransactions,
      totalAccountBalance: decimalToNumber(totalAccountBalance._sum.balance),
      totalInvestedValue: decimalToNumber(totalInvestedValue._sum.currentValue),
    },
    estimatedRevenue: {
      currency: activeSubscriptionsForRevenue.find((subscription) => subscription.package)?.package?.currency || 'BDT',
      monthlyRecurringValue,
      annualRecurringValue: monthlyRecurringValue * 12,
    },
    siteVisits: {
      totalViews: totalPageViews,
      viewsToday,
      viewsLast30Days,
      uniqueVisitorsLast30Days: uniqueVisitorsLast30Days.length,
      uniqueVisitorsToday: uniqueVisitorsToday.length,
      loggedInViewsLast30Days,
      anonymousViewsLast30Days,
      topRoutes,
      deviceBreakdown,
      browserBreakdown,
      recentViews: recentViews.map((view) => ({
        ...view,
        createdAt: view.createdAt.toISOString(),
      })),
    },
    liveActivity: {
      onlineUsersNow: onlineUsersNowRows.length,
      activeSessionsNow,
      activeUsersToday: activeUsersTodayRows.length,
      activeUsersThisWeek: activeUsersThisWeekRows.length,
      activeRoutes,
      recentActiveUsers: recentActivityRows.map((activity) => ({
        id: activity.id,
        name: activity.user.name,
        email: activity.user.email,
        currentPath: activity.currentPath,
        deviceType: activity.deviceType,
        browser: activity.browser,
        lastSeenAt: activity.lastSeenAt.toISOString(),
      })),
    },
    trends,
    packageMix,
    recentUsers: recentUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
      subscription: user.subscription
        ? {
            status: user.subscription.status,
            source: user.subscription.source,
            packageName: user.subscription.package?.name || null,
          }
        : null,
    })),
  };
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
    return { success: true, message: `${parsed.data.name} তৈরি হয়েছে` };
  } catch {
    return { success: false, message: 'প্যাকেজ তৈরি করা যায়নি। স্লাগ unique কিনা দেখুন।' };
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
    return { success: true, message: `${parsed.data.name} আপডেট হয়েছে` };
  } catch {
    return { success: false, message: 'প্যাকেজ আপডেট করা যায়নি। স্লাগ unique কিনা দেখুন।' };
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
  return { success: true, message: `${pkg.name} ${isActive ? 'সক্রিয় হয়েছে' : 'নিষ্ক্রিয় হয়েছে'}` };
}

export async function createManualPaymentMethodAction(formData: FormData): Promise<ActionResponse> {
  await requireRole('ADMIN');

  const parsed = parseManualPaymentMethodFormData(formData);
  if (!parsed.success || !parsed.data) return { success: false, message: parsed.message };

  try {
    await prisma.manualPaymentMethod.create({ data: parsed.data });
    revalidatePath('/admin/subscriptions');
    revalidatePath('/subscription');
    return { success: true, message: `${parsed.data.label} পেমেন্ট অ্যাকাউন্ট তৈরি হয়েছে` };
  } catch {
    return { success: false, message: 'পেমেন্ট অ্যাকাউন্ট তৈরি করা যায়নি' };
  }
}

export async function updateManualPaymentMethodAction(methodId: string, formData: FormData): Promise<ActionResponse> {
  await requireRole('ADMIN');

  const parsed = parseManualPaymentMethodFormData(formData);
  if (!parsed.success || !parsed.data) return { success: false, message: parsed.message };

  try {
    await prisma.manualPaymentMethod.update({
      where: { id: methodId },
      data: parsed.data,
    });
    revalidatePath('/admin/subscriptions');
    revalidatePath('/subscription');
    return { success: true, message: `${parsed.data.label} পেমেন্ট অ্যাকাউন্ট আপডেট হয়েছে` };
  } catch {
    return { success: false, message: 'পেমেন্ট অ্যাকাউন্ট আপডেট করা যায়নি' };
  }
}

export async function setManualPaymentMethodActiveAction(methodId: string, isActive: boolean): Promise<ActionResponse> {
  await requireRole('ADMIN');

  const method = await prisma.manualPaymentMethod.update({
    where: { id: methodId },
    data: { isActive },
  });

  revalidatePath('/admin/subscriptions');
  revalidatePath('/subscription');
  return { success: true, message: `${method.label} ${isActive ? 'সক্রিয় হয়েছে' : 'নিষ্ক্রিয় হয়েছে'}` };
}

export async function approveManualPaymentRequestAction(requestId: string, formData?: FormData): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'অনুমতি নেই' };
  await requireRole('ADMIN');

  const adminNote = String(formData?.get('adminNote') || '').trim() || null;
  if (adminNote && adminNote.length > 500) return { success: false, message: 'অ্যাডমিন নোট ৫০০ অক্ষরের মধ্যে হতে হবে' };

  const request = await prisma.manualPaymentRequest.findUnique({
    where: { id: requestId },
    include: {
      package: true,
      user: { select: { email: true } },
    },
  });

  if (!request) return { success: false, message: 'পেমেন্ট রিকোয়েস্ট পাওয়া যায়নি' };
  if (request.status !== 'PENDING') return { success: false, message: 'শুধু পেন্ডিং পেমেন্ট অনুমোদন করা যায়' };
  if (Number(request.package.price) === 0 && request.package.trialDays > 0) {
    return { success: false, message: 'ট্রায়াল প্যাকেজ পেমেন্ট ছাড়াই ব্যবহারকারী নিজে চালু করবে' };
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const existingSubscription = await tx.userSubscription.findUnique({
      where: { userId: request.userId },
      select: { currentPeriodEnd: true, status: true },
    });
    const baseDate =
      existingSubscription?.status === 'ACTIVE' &&
      existingSubscription.currentPeriodEnd &&
      existingSubscription.currentPeriodEnd > now
        ? existingSubscription.currentPeriodEnd
        : now;
    const currentPeriodEnd = addSubscriptionInterval(baseDate, request.package.interval);

    await tx.manualPaymentRequest.update({
      where: { id: request.id },
      data: {
        status: 'APPROVED',
        adminNote,
        reviewedAt: now,
        reviewedById: session.user.id,
      },
    });

    await tx.userSubscription.upsert({
      where: { userId: request.userId },
      update: {
        packageId: request.packageId,
        plan: 'PRO',
        interval: request.package.interval,
        source: 'SELF_SERVICE',
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        providerSubscriptionId: `manual:${request.id}`,
      },
      create: {
        userId: request.userId,
        packageId: request.packageId,
        plan: 'PRO',
        interval: request.package.interval,
        source: 'SELF_SERVICE',
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        providerSubscriptionId: `manual:${request.id}`,
      },
    });
  });

  revalidatePath('/admin/subscriptions');
  revalidatePath('/admin/payments');
  revalidatePath('/subscription');
  revalidatePath('/subscription/payment');
  revalidatePath('/settings');
  revalidatePath('/dashboard');
  return { success: true, message: `${request.user.email}-এর পেমেন্ট অনুমোদিত এবং অ্যাক্সেস সক্রিয় হয়েছে` };
}

export async function rejectManualPaymentRequestAction(requestId: string, formData?: FormData): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'অনুমতি নেই' };
  await requireRole('ADMIN');

  const adminNote = String(formData?.get('adminNote') || '').trim() || null;
  if (adminNote && adminNote.length > 500) return { success: false, message: 'অ্যাডমিন নোট ৫০০ অক্ষরের মধ্যে হতে হবে' };

  const request = await prisma.manualPaymentRequest.findUnique({
    where: { id: requestId },
    select: { id: true, status: true, user: { select: { email: true } } },
  });
  if (!request) return { success: false, message: 'পেমেন্ট রিকোয়েস্ট পাওয়া যায়নি' };
  if (request.status !== 'PENDING') return { success: false, message: 'শুধু পেন্ডিং পেমেন্ট রিজেক্ট করা যায়' };

  await prisma.manualPaymentRequest.update({
    where: { id: request.id },
    data: {
      status: 'REJECTED',
      adminNote,
      reviewedAt: new Date(),
      reviewedById: session.user.id,
    },
  });

  revalidatePath('/admin/subscriptions');
  revalidatePath('/admin/payments');
  revalidatePath('/subscription');
  revalidatePath('/subscription/payment');
  revalidatePath('/settings');
  revalidatePath('/dashboard');
  return { success: true, message: `${request.user.email}-এর পেমেন্ট রিজেক্ট হয়েছে` };
}

export async function createUserInviteAction(formData: FormData): Promise<ActionResponse<AdminInviteResult>> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'অনুমতি নেই' };
  await requireRole('ADMIN');

  const email = String(formData.get('email') || '').trim().toLowerCase();
  const role = String(formData.get('role') || 'USER') as UserRole;
  const packageId = String(formData.get('packageId') || '').trim() || null;
  const expiresInDays = Number(formData.get('expiresInDays') || 7);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: 'সঠিক ইমেইল প্রয়োজন' };
  }
  if (role !== 'ADMIN' && role !== 'USER') {
    return { success: false, message: 'ইনভাইট রোল সঠিক নয়' };
  }
  if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 30) {
    return { success: false, message: 'ইনভাইট মেয়াদ ১ থেকে ৩০ দিনের মধ্যে হতে হবে' };
  }

  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) {
    return { success: false, message: 'এই ইমেইলে ব্যবহারকারী আগে থেকেই আছে' };
  }

  if (packageId) {
    const pkg = await prisma.subscriptionPackage.findFirst({ where: { id: packageId, isActive: true }, select: { id: true } });
    if (!pkg) return { success: false, message: 'নির্বাচিত প্যাকেজ পাওয়া যাচ্ছে না' };
  }

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  await prisma.userInvite.create({
    data: {
      email,
      role,
      packageId: role === 'ADMIN' ? null : packageId,
      tokenHash: hashInviteToken(token),
      expiresAt,
      invitedById: session.user.id,
    },
  });

  revalidatePath('/admin/users');
  return {
    success: true,
    message: `${email}-এর জন্য ইনভাইট তৈরি হয়েছে`,
    data: {
      email,
      inviteUrl: `/register?invite=${encodeURIComponent(token)}`,
      expiresAt: expiresAt.toISOString(),
    },
  };
}

export async function createUserWithTemporaryPasswordAction(formData: FormData): Promise<ActionResponse<AdminCreateUserResult>> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'অনুমতি নেই' };
  await requireRole('ADMIN');

  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const role = String(formData.get('role') || 'USER') as UserRole;
  const temporaryPassword = String(formData.get('temporaryPassword') || '');
  const packageId = String(formData.get('packageId') || '').trim() || null;

  if (name.length < 2) return { success: false, message: 'নাম কমপক্ষে ২ অক্ষরের হতে হবে' };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: 'সঠিক ইমেইল প্রয়োজন' };
  }
  if (role !== 'ADMIN' && role !== 'USER') return { success: false, message: 'ব্যবহারকারীর রোল সঠিক নয়' };
  if (temporaryPassword.length < 6) return { success: false, message: 'টেম্পোরারি পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' };

  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) return { success: false, message: 'এই ইমেইলে ব্যবহারকারী আগে থেকেই আছে' };

  const subscriptionPackage = packageId && role !== 'ADMIN'
    ? await prisma.subscriptionPackage.findFirst({ where: { id: packageId, isActive: true } })
    : null;
  if (packageId && role !== 'ADMIN' && !subscriptionPackage) {
    return { success: false, message: 'নির্বাচিত প্যাকেজ পাওয়া যাচ্ছে না' };
  }

  const now = new Date();
  const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        preferredLocale: 'bn-BD',
        role,
        status: 'ACTIVE',
        emailVerifiedAt: now,
        mustChangePassword: true,
      },
    });

    await tx.category.createMany({
      data: [
        { name: 'Salary', type: 'INCOME' as const, icon: 'briefcase', color: '#10b981' },
        { name: 'Freelance', type: 'INCOME' as const, icon: 'laptop', color: '#06b6d4' },
        { name: 'Investments', type: 'INCOME' as const, icon: 'trending-up', color: '#8b5cf6' },
        { name: 'Other Income', type: 'INCOME' as const, icon: 'plus-circle', color: '#6366f1' },
        { name: 'Food & Dining', type: 'EXPENSE' as const, icon: 'utensils', color: '#ef4444' },
        { name: 'Transportation', type: 'EXPENSE' as const, icon: 'car', color: '#f97316' },
        { name: 'Housing', type: 'EXPENSE' as const, icon: 'home', color: '#eab308' },
        { name: 'Utilities', type: 'EXPENSE' as const, icon: 'zap', color: '#14b8a6' },
        { name: 'Entertainment', type: 'EXPENSE' as const, icon: 'film', color: '#ec4899' },
        { name: 'Shopping', type: 'EXPENSE' as const, icon: 'shopping-bag', color: '#a855f7' },
        { name: 'Healthcare', type: 'EXPENSE' as const, icon: 'heart', color: '#f43f5e' },
        { name: 'Education', type: 'EXPENSE' as const, icon: 'book', color: '#3b82f6' },
        { name: 'Personal', type: 'EXPENSE' as const, icon: 'user', color: '#64748b' },
        { name: 'Other Expense', type: 'EXPENSE' as const, icon: 'minus-circle', color: '#78716c' },
      ].map((cat) => ({
        userId: user.id,
        ...cat,
        isDefault: true,
      })),
    });

    await tx.account.create({
      data: {
        userId: user.id,
        name: 'Cash',
        type: 'CASH',
        balance: 0,
        color: '#10b981',
        icon: 'wallet',
      },
    });

    if (subscriptionPackage) {
      const currentPeriodEnd = new Date(now);
      if (subscriptionPackage.interval === 'YEARLY') {
        currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
      } else {
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
      }

      await tx.userSubscription.create({
        data: {
          userId: user.id,
          packageId: subscriptionPackage.id,
          plan: 'PRO',
          interval: subscriptionPackage.interval,
          source: 'ADMIN_GRANT',
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd,
          grantedById: session.user.id,
        },
      });
    }
  });

  revalidatePath('/admin/users');
  revalidatePath('/admin/subscriptions');
  return {
    success: true,
    message: `${email} তৈরি হয়েছে। টেম্পোরারি পাসওয়ার্ড নিরাপদে শেয়ার করুন।`,
    data: {
      name,
      email,
      role,
      packageName: subscriptionPackage?.name || null,
      temporaryPassword,
      mustChangePassword: true,
    },
  };
}

export async function updateUserRoleAction(userId: string, role: UserRole): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'অনুমতি নেই' };
  await requireRole('ADMIN');

  if (role !== 'ADMIN' && role !== 'USER') {
    return { success: false, message: 'রোল সঠিক নয়' };
  }

  if (userId === session.user.id && role !== 'ADMIN') {
    return { success: false, message: 'নিজের অ্যাডমিন রোল সরাতে পারবেন না।' };
  }

  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!targetUser) return { success: false, message: 'ব্যবহারকারী পাওয়া যায়নি' };
  if (targetUser.role === 'ADMIN' && role !== 'ADMIN' && adminCount <= 1) {
    return { success: false, message: 'কমপক্ষে একজন অ্যাডমিন প্রয়োজন।' };
  }

  await prisma.user.update({ where: { id: userId }, data: { role, sessionVersion: { increment: 1 } } });
  revalidatePath('/admin/users');
  return { success: true, message: 'ব্যবহারকারীর রোল আপডেট হয়েছে' };
}

export async function updateUserStatusAction(userId: string, status: UserStatus): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'অনুমতি নেই' };
  await requireRole('ADMIN');

  if (status !== 'ACTIVE' && status !== 'SUSPENDED') {
    return { success: false, message: 'এখানে শুধু active এবং suspended status ম্যানেজ করা যায়।' };
  }

  if (userId === session.user.id && status !== 'ACTIVE') {
    return { success: false, message: 'নিজের অ্যাকাউন্ট সাসপেন্ড করতে পারবেন না।' };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, role: true, status: true },
  });
  if (!targetUser) return { success: false, message: 'ব্যবহারকারী পাওয়া যায়নি' };

  if (targetUser.role === 'ADMIN' && targetUser.status === 'ACTIVE' && status !== 'ACTIVE') {
    const activeAdminCount = await prisma.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } });
    if (activeAdminCount <= 1) {
      return { success: false, message: 'কমপক্ষে একজন সক্রিয় অ্যাডমিন প্রয়োজন।' };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      status,
      lockedUntil: null,
      sessionVersion: { increment: 1 },
    },
  });

  revalidatePath('/admin/users');
  revalidatePath('/admin/subscriptions');
  return { success: true, message: `${targetUser.email} ${status === 'ACTIVE' ? 'পুনরায় সক্রিয় হয়েছে' : 'সাসপেন্ড হয়েছে'}` };
}

export async function deleteUserAccountAction(userId: string, mode: 'soft' | 'permanent'): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'অনুমতি নেই' };
  await requireRole('ADMIN');

  if (mode !== 'soft' && mode !== 'permanent') {
    return { success: false, message: 'ডিলিট মোড সঠিক নয়' };
  }

  if (userId === session.user.id) {
    return { success: false, message: 'নিজের অ্যাকাউন্ট অ্যাডমিন প্যানেল থেকে ডিলিট করা যাবে না।' };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, role: true, status: true },
  });
  if (!targetUser) return { success: false, message: 'ব্যবহারকারী পাওয়া যায়নি' };

  if (targetUser.role === 'ADMIN' && targetUser.status === 'ACTIVE') {
    const activeAdminCount = await prisma.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } });
    if (activeAdminCount <= 1) {
      return { success: false, message: 'কমপক্ষে একজন সক্রিয় অ্যাডমিন প্রয়োজন।' };
    }
  }

  if (mode === 'permanent') {
    await prisma.$transaction(async (tx) => {
      await tx.accountDeletionRecord.create({
        data: {
          deletedUserId: userId,
          originalName: targetUser.name,
          originalEmail: targetUser.email,
          originalRole: targetUser.role,
          deletionType: 'ADMIN_PERMANENT',
          performedById: session.user.id,
          performedByName: session.user.name || null,
          performedByEmail: session.user.email || null,
          note: 'Admin permanently deleted this account.',
        },
      });
      await tx.user.delete({ where: { id: userId } });
    });
    revalidatePath('/admin/users');
    revalidatePath('/admin/subscriptions');
    revalidatePath('/admin/payments');
    return { success: true, message: `${targetUser.email} স্থায়ীভাবে ডিলিট হয়েছে` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.accountDeletionRecord.create({
      data: {
        deletedUserId: userId,
        originalName: targetUser.name,
        originalEmail: targetUser.email,
        originalRole: targetUser.role,
        deletionType: 'ADMIN_SOFT',
        performedById: session.user.id,
        performedByName: session.user.name || null,
        performedByEmail: session.user.email || null,
        note: 'Admin soft deleted this account. Original login email is still retained on the user row.',
      },
    });
    await tx.userSubscription.updateMany({
      where: { userId },
      data: {
        status: 'CANCELED',
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: true,
      },
    });
    await tx.user.update({
      where: { id: userId },
      data: {
        status: 'DELETED',
        lockedUntil: null,
        sessionVersion: { increment: 1 },
      },
    });
  });

  revalidatePath('/admin/users');
  revalidatePath('/admin/subscriptions');
  return { success: true, message: `${targetUser.email} soft delete হয়েছে` };
}

export async function grantUserAccessAction(formData: FormData): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'অনুমতি নেই' };
  await requireRole('ADMIN');

  const identifier = String(formData.get('identifier') || formData.get('email') || '').trim();
  const email = identifier.toLowerCase();
  const duration = String(formData.get('duration') || '');
  const packageId = String(formData.get('packageId') || '').trim() || null;
  if (!identifier) return { success: false, message: 'ব্যবহারকারীর ইমেইল বা ফোন নম্বর প্রয়োজন' };
  if (!['MONTHLY', 'YEARLY', 'UNLIMITED'].includes(duration)) {
    return { success: false, message: 'গ্র্যান্ট সময়কাল সঠিক নয়' };
  }

  const targetUser = await prisma.user.findFirst({
    where: identifier.includes('@')
      ? { email }
      : { phoneNumber: normalizePhoneNumber(identifier) },
  });
  if (!targetUser) return { success: false, message: 'ব্যবহারকারী পাওয়া যায়নি' };

  const now = new Date();
  let currentPeriodEnd: Date | null = null;
  let interval: SubscriptionInterval | null = null;
  let grantedPackageId: string | null = null;

  const subscriptionPackage = packageId && duration !== 'UNLIMITED'
    ? await prisma.subscriptionPackage.findFirst({ where: { id: packageId, isActive: true } })
    : null;

  if (packageId && duration !== 'UNLIMITED' && !subscriptionPackage) {
    return { success: false, message: 'সাবস্ক্রিপশন প্যাকেজ পাওয়া যাচ্ছে না' };
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
      ? `${targetUser.email}-কে ${currentPeriodEnd.toLocaleDateString('bn-BD')} পর্যন্ত full access দেওয়া হয়েছে`
      : `${targetUser.email}-কে unlimited full access দেওয়া হয়েছে`,
  };
}

export async function revokeUserAccessAction(userId: string): Promise<ActionResponse> {
  await requireRole('ADMIN');

  const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true } });
  if (!targetUser) return { success: false, message: 'ব্যবহারকারী পাওয়া যায়নি' };
  if (targetUser.role === 'ADMIN') return { success: false, message: 'এখান থেকে অ্যাডমিন অ্যাক্সেস revoke করা যাবে না।' };

  await prisma.userSubscription.deleteMany({ where: { userId } });
  revalidatePath('/admin/subscriptions');
  return { success: true, message: `${targetUser.email}-এর অ্যাক্সেস revoke হয়েছে` };
}
