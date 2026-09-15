import { z } from 'zod';

export const vehicleSourceEnum = z.enum([
  'trade_in',
  'auction',
  'part_ex',
  'sourced_ai',
  'other',
]);

export const vehicleLifecycleStatusEnum = z.enum([
  'incoming',
  'in_prep',
  'listed',
  'reserved',
  'sold',
  'archived',
  // Backwards compatibility mappings for existing statuses
  'acquiring',
  'purchased',
  'in_transit',
  'arrived',
  'inspection',
  'preparation',
  'photography',
  'ready_for_sale',
  'available',
  'advertised',
  'handover',
  'completed',
  'returned',
  'wholesale',
]);

export const vehicleInputSchema = z.object({
  id: z.string().uuid().optional(),
  dealership_id: z.string().uuid().optional(),
  registration: z
    .string()
    .min(2, 'Registration must be at least 2 characters')
    .max(10, 'Registration cannot exceed 10 characters')
    .transform((v) => v.toUpperCase().replace(/\s+/g, '')),
  vrm: z.string().optional(),
  vin: z
    .string()
    .max(17, 'VIN cannot exceed 17 characters')
    .optional()
    .nullable(),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  derivative: z.string().optional().nullable(),
  variant: z.string().optional().nullable(),
  year: z
    .number()
    .int()
    .min(1900, 'Year must be after 1900')
    .max(new Date().getFullYear() + 2, 'Invalid model year'),
  mileage: z.number().int().min(0, 'Mileage cannot be negative'),
  fuel_type: z.string().optional().nullable(),
  transmission: z.string().optional().nullable(),
  body_type: z.string().optional().nullable(),
  colour: z.string().optional().nullable(),
  doors: z.number().int().min(2).max(6).optional().nullable(),
  engine_size: z.string().optional().nullable(),
  co2_g_per_km: z.number().int().min(0).optional().nullable(),
  mot_expiry: z.string().optional().nullable(),
  cost_price: z.number().min(0, 'Cost price cannot be negative').optional().nullable(),
  purchase_price: z.number().min(0, 'Purchase price cannot be negative').optional().nullable(),
  forecourt_price: z.number().min(0, 'Forecourt price cannot be negative').optional().nullable(),
  asking_price: z.number().min(0, 'Asking price cannot be negative').optional().nullable(),
  status: vehicleLifecycleStatusEnum.default('available'),
  source: vehicleSourceEnum.default('other'),
  description: z.string().optional().nullable(),
  location_id: z.string().uuid().optional().nullable(),
  assigned_user_id: z.string().uuid().optional().nullable(),
});

export type VehicleInput = z.infer<typeof vehicleInputSchema>;

export const bulkStatusChangeSchema = z.object({
  vehicleIds: z.array(z.string().uuid()).min(1, 'Select at least one vehicle'),
  newStatus: vehicleLifecycleStatusEnum,
  reason: z.string().optional(),
});

export type BulkStatusChangeInput = z.infer<typeof bulkStatusChangeSchema>;

export const bulkPriceAdjustmentSchema = z.object({
  vehicleIds: z.array(z.string().uuid()).min(1, 'Select at least one vehicle'),
  adjustmentType: z.enum(['percent', 'fixed']),
  amount: z.number().refine((val) => val !== 0, {
    message: 'Adjustment amount cannot be zero',
  }),
});

export type BulkPriceAdjustmentInput = z.infer<typeof bulkPriceAdjustmentSchema>;

export const savedFilterPresetSchema = z.object({
  name: z.string().min(1, 'Preset name is required').max(50, 'Name too long'),
  filters: z.record(z.any()),
  is_default: z.boolean().default(false),
});

export type SavedFilterPresetInput = z.infer<typeof savedFilterPresetSchema>;

export const prepTaskSchema = z.object({
  vehicle_id: z.string().uuid(),
  title: z.string().min(2, 'Task title required'),
  category: z
    .enum([
      'mechanical',
      'service',
      'mot',
      'tyres',
      'alloy_wheel',
      'bodywork',
      'smart_repair',
      'valeting',
      'detailing',
      'photography',
      'other',
    ])
    .default('mechanical'),
  estimated_cost: z.number().min(0).default(0),
  actual_cost: z.number().min(0).default(0),
  status: z
    .enum(['not_started', 'scheduled', 'in_progress', 'waiting', 'completed', 'cancelled'])
    .default('not_started'),
  assigned_to: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type PrepTaskInput = z.infer<typeof prepTaskSchema>;
