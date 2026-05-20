const DEFAULT_PENDING_PAYMENT_ACCESS_HOURS = 24;

export type PendingPaymentAccessRequest = {
  id: string;
  createdAt: Date;
  package?: {
    name: string;
  } | null;
};

export function getPendingPaymentAccessHours() {
  const configuredHours = Number(process.env.PENDING_PAYMENT_ACCESS_HOURS || DEFAULT_PENDING_PAYMENT_ACCESS_HOURS);
  if (!Number.isFinite(configuredHours) || configuredHours <= 0) return DEFAULT_PENDING_PAYMENT_ACCESS_HOURS;
  return configuredHours;
}

export function getPendingPaymentAccessEnd(createdAt: Date, hours: number = getPendingPaymentAccessHours()) {
  return new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
}

export function getPendingPaymentAccessState(
  request?: PendingPaymentAccessRequest | null,
  now: Date = new Date(),
) {
  if (!request) {
    return {
      request: null,
      accessUntil: null,
      isActive: false,
      hours: getPendingPaymentAccessHours(),
    };
  }

  const hours = getPendingPaymentAccessHours();
  const accessUntil = getPendingPaymentAccessEnd(request.createdAt, hours);

  return {
    request,
    accessUntil,
    isActive: accessUntil >= now,
    hours,
  };
}
