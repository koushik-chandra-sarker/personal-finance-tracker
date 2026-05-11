import { z } from 'zod';

export const supportTicketStatusValues = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
export const supportTicketPriorityValues = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export const supportTicketCategoryValues = ['GENERAL', 'BILLING', 'BUG_REPORT', 'FEATURE_REQUEST', 'ACCOUNT_ISSUE'] as const;

export const supportTicketSchema = z.object({
  subject: z.string().trim().min(4, 'Subject must be at least 4 characters.').max(120, 'Subject is too long.'),
  description: z.string().trim().min(10, 'Description must be at least 10 characters.').max(5000, 'Description is too long.'),
  phoneNumber: z.string().trim().max(40, 'Phone number is too long.').optional().nullable(),
  priority: z.enum(supportTicketPriorityValues),
  category: z.enum(supportTicketCategoryValues),
});

export const supportReplySchema = z.object({
  message: z.string().trim().min(1, 'Message is required.').max(5000, 'Message is too long.'),
});

export const supportStatusSchema = z.object({
  status: z.enum(supportTicketStatusValues),
});

export const supportPinSchema = z.object({
  pin: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit support PIN.'),
});
