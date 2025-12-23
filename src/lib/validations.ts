import { z } from 'zod';

// Helper for optional URL fields that can be empty strings
const optionalUrl = z
  .string()
  .optional()
  .nullable()
  .refine(
    (val) => {
      if (!val || val === '') return true; // Empty is valid
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'URL inválida' }
  );

// User validations
export const userProfileSchema = z.object({
  email: z.string().email('Email inválido'),
  full_name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  role: z.enum(['admin', 'pm', 'dev', 'advisor']),
  avatar_url: z.string().url().optional().or(z.literal('')),
});

// Client validations
export const clientSchema = z.object({
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  contact_name: z.string().optional(),
  contact_email: z.string().email('Email inválido').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
});

// Project validations
export const projectSchema = z.object({
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  client_id: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.enum(['planning', 'active', 'paused', 'completed', 'cancelled']).default('planning'),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  repo_url: optionalUrl,
  staging_url: optionalUrl,
  prod_url: optionalUrl,
  deployment_platform: z.string().optional().nullable(),
  deployment_platform_other: z.string().optional().nullable(),
});

// Task validations
export const taskSchema = z.object({
  project_id: z.string().uuid('Proyecto requerido'),
  title: z.string().min(2, 'Título debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assigned_to: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable().transform((val) => val === '' ? null : val),
  tags: z.array(z.string()).optional().default([]),
});

// Credential validations
export const credentialSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  service: z.string().min(2, 'Servicio requerido'),
  username: z.string().optional(),
  password: z.string().optional(), // Changed from password_encrypted
  url: optionalUrl,
  notes: z.string().optional(),
  visible_to_devs: z.boolean().default(false),
});

// Finance validations
export const projectFinanceSchema = z.object({
  project_id: z.string().uuid(),
  total_value: z.number().min(0),
  currency: z.string().default('USD'),
});

export const paymentSchema = z.object({
  project_id: z.string().uuid(),
  amount: z.number().min(0.01, 'Monto debe ser mayor a 0'),
  hosting_cost: z.number().min(0).default(0).optional(),
  domain_cost: z.number().min(0).default(0).optional(),
  other_cost: z.number().min(0).default(0).optional(),
  other_cost_description: z.string().optional(),
  payment_date: z.string(),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).default('pending'),
  type: z.enum(['income', 'expense']).default('income'),
  payment_method: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const projectCostSchema = z.object({
  project_id: z.string().uuid(),
  description: z.string().min(2, 'Descripción requerida'),
  amount: z.number().min(0.01, 'Monto debe ser mayor a 0'),
  category: z.string().optional(),
  cost_date: z.string(),
  is_recurring: z.boolean().default(false),
});

export const recurringChargeSchema = z.object({
  project_id: z.string().uuid(),
  description: z.string().min(2, 'Descripción requerida'),
  amount: z.number().min(0.01, 'Monto debe ser mayor a 0'),
  period: z.enum(['monthly', 'quarterly', 'annual', 'custom']),
  custom_days: z.number().min(1).optional().nullable(),
  start_date: z.string(),
  next_due_date: z.string(),
  is_active: z.boolean().default(true),
  type: z.enum(['income', 'expense']).default('income'),
});

export const paymentMethodSchema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

// Auth validations
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
});

export const signupSchema = loginSchema.extend({
  full_name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  role: z.enum(['admin', 'pm', 'dev', 'advisor']).default('dev'),
});

// Types
export type ClientFormData = z.infer<typeof clientSchema>;
export type ProjectFormData = z.infer<typeof projectSchema>;
export type TaskFormData = z.infer<typeof taskSchema>;
export type CredentialFormData = z.infer<typeof credentialSchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>;
export type ProjectCostFormData = z.infer<typeof projectCostSchema>;
export type RecurringChargeFormData = z.infer<typeof recurringChargeSchema>;
export type PaymentMethodFormData = z.infer<typeof paymentMethodSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;