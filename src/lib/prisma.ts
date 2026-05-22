import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

type RuntimePrismaClient = PrismaClient & {
  _runtimeDataModel?: {
    models?: Record<string, { fields?: Array<{ name?: string }> }>;
    enums?: Record<string, { values?: Array<{ name?: string }> }>;
  };
};

function hasCurrentPrismaDelegates(client: PrismaClient | undefined) {
  const runtimeClient = client as RuntimePrismaClient | undefined;
  const tutorialFields = runtimeClient?._runtimeDataModel?.models?.Tutorial?.fields;
  const userFields = runtimeClient?._runtimeDataModel?.models?.User?.fields;
  const adminMessageFields = runtimeClient?._runtimeDataModel?.models?.AdminMessage?.fields;
  const adminMessageStateFields = runtimeClient?._runtimeDataModel?.models?.AdminMessageState?.fields;
  const adminMessageDisplayModeValues = runtimeClient?._runtimeDataModel?.enums?.AdminMessageDisplayMode?.values;
  const userExperienceModeValues = runtimeClient?._runtimeDataModel?.enums?.UserExperienceMode?.values;
  const hasTutorialPremiumFlag = tutorialFields?.some((field) => field.name === 'isPremium') ?? false;
  const hasUserExperienceModeField = userFields?.some((field) => field.name === 'experienceMode') ?? false;
  const hasUserOnboardingCompletedField = userFields?.some((field) => field.name === 'onboardingCompletedAt') ?? false;
  const hasUserAppPinReminderField = userFields?.some((field) => field.name === 'appPinReminderAt') ?? false;
  const hasUserExperienceModeEnum = Boolean(
    userExperienceModeValues?.some((value) => value.name === 'BASIC') &&
    userExperienceModeValues?.some((value) => value.name === 'FULL')
  );
  const hasAdminMessageBrowserPushFlag = adminMessageFields?.some((field) => field.name === 'browserPushEnabled') ?? false;
  const hasAdminMessageBrowserPushState = adminMessageStateFields?.some((field) => field.name === 'browserPushLastSentAt') ?? false;
  const hasPushOnlyAdminMessageDisplayMode = adminMessageDisplayModeValues?.some((value) => value.name === 'PUSH_ONLY') ?? false;
  const hasAdminMessageModel = Boolean(runtimeClient?._runtimeDataModel?.models?.AdminMessage);
  const hasManualPaymentModel = Boolean(runtimeClient?._runtimeDataModel?.models?.ManualPaymentRequest);
  const hasSalaryScenarioModel = Boolean(runtimeClient?._runtimeDataModel?.models?.SalaryScenario);
  const hasAccountDeletionRecordModel = Boolean(runtimeClient?._runtimeDataModel?.models?.AccountDeletionRecord);
  const hasBrowserPushSubscriptionModel = Boolean(runtimeClient?._runtimeDataModel?.models?.BrowserPushSubscription);

  return Boolean(
    client &&
    'investmentCashflow' in client &&
    'pageView' in client &&
    'userActivity' in client &&
    'accountDeletionRecord' in client &&
    hasTutorialPremiumFlag &&
    hasUserExperienceModeField &&
    hasUserOnboardingCompletedField &&
    hasUserAppPinReminderField &&
    hasUserExperienceModeEnum &&
    hasAdminMessageBrowserPushFlag &&
    hasAdminMessageBrowserPushState &&
    hasPushOnlyAdminMessageDisplayMode &&
    hasAdminMessageModel &&
    hasManualPaymentModel &&
    hasSalaryScenarioModel &&
    hasAccountDeletionRecordModel &&
    hasBrowserPushSubscriptionModel
  );
}

const cachedPrisma = globalForPrisma.prisma;
const canReuseCachedPrisma = hasCurrentPrismaDelegates(cachedPrisma);

// During next dev, Prisma can be regenerated while the old client instance is
// still cached on globalThis. Replace that stale instance after schema changes.
// Do not disconnect the old instance here: hot-reloaded modules can still have
// in-flight requests using it, and disconnecting it causes transient
// "Engine is not yet connected" errors in dev.

export const prisma = canReuseCachedPrisma ? cachedPrisma! : new PrismaClient({
  transactionOptions: {
    maxWait: 10000,
    timeout: 20000,
  },
});
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
