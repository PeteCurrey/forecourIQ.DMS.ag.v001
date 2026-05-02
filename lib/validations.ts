import * as z from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const signupSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  dealershipName: z.string().min(2, 'Dealership name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  plan: z.enum(['starter', 'professional', 'elite']).default('professional'),
})

export const vehicleSchema = z.object({
  registration: z.string().min(1, 'Registration is required'),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  variant: z.string().optional(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  mileage: z.number().int().min(0),
  colour: z.string().optional(),
  fuel_type: z.string().optional(),
  transmission: z.string().optional(),
  body_type: z.string().optional(),
  doors: z.number().int().optional(),
  engine_size: z.string().optional(),
  mot_expiry: z.string().optional(),
  condition: z.string().optional(),
  service_history: z.string().optional(),
  description: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  purchase_price: z.number().min(0),
  asking_price: z.number().min(0),
  prep_cost: z.number().min(0).default(0),
  transport_cost: z.number().min(0).default(0),
  status: z.string().default('available'),
})

export const leadSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  message: z.string().optional(),
  source: z.string().default('website'),
  vehicle_id: z.string().uuid().optional().nullable(),
  finance_interest: z.boolean().default(false),
  part_ex_reg: z.string().optional().nullable(),
}).refine(data => data.email || data.phone, {
  message: "Either email or phone is required",
  path: ["email"]
})
