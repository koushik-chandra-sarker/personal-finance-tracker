import { z } from 'zod';

const pinSchema = z.string().trim().regex(/^\d{4,6}$/, 'Enter a 4 to 6 digit PIN.');

export const createAppPinSchema = z.object({
  pin: pinSchema,
  confirmPin: pinSchema,
}).refine((value) => value.pin === value.confirmPin, {
  path: ['confirmPin'],
  message: 'PINs do not match.',
});

export const verifyAppPinSchema = z.object({
  pin: pinSchema,
});
