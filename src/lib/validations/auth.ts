import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Phone or email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const phoneRegistrationStartSchema = z.object({
  phoneNumber: z.string().trim().min(8, 'Phone number is required').max(24, 'Phone number is too long'),
});

export const phoneOtpVerifySchema = phoneRegistrationStartSchema.extend({
  otpCode: z.string().trim().regex(/^\d{6}$/, 'Enter the 6 digit OTP'),
});

export const registerSchema = z.object({
  username: z.string().trim().min(2, 'Username must be at least 2 characters').max(40, 'Username is too long'),
  email: z.string().trim().optional().transform((value) => value || undefined).pipe(z.string().email('Invalid email address').optional()),
  phoneNumber: z.string().trim().min(8, 'Phone number is required').max(24, 'Phone number is too long'),
  otpVerificationId: z.string().min(1, 'Phone verification is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  inviteToken: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const backdoorResetSchema = z.object({
  email: z.string().email('Invalid email address'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const firstLoginPasswordSchema = z.object({
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type BackdoorResetInput = z.infer<typeof backdoorResetSchema>;
export type FirstLoginPasswordInput = z.infer<typeof firstLoginPasswordSchema>;
