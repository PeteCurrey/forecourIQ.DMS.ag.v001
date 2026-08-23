import { createClient } from '@/lib/supabase/server'
import { ForbiddenError } from '@/lib/errors'

export type PermissionKey =
  | 'stock.read'
  | 'stock.create'
  | 'stock.update'
  | 'stock.delete'
  | 'stock.costs'
  | 'stock.publish'
  | 'customers.read'
  | 'customers.create'
  | 'customers.update'
  | 'customers.delete'
  | 'leads.read'
  | 'leads.create'
  | 'leads.update'
  | 'leads.assign'
  | 'leads.respond'
  | 'deals.read'
  | 'deals.create'
  | 'deals.update'
  | 'deals.discount'
  | 'deals.approve_discount'
  | 'deals.complete'
  | 'deals.cancel'
  | 'part_exchange.read'
  | 'part_exchange.manage'
  | 'payments.read'
  | 'payments.record'
  | 'payments.refund'
  | 'handover.manage'
  | 'documents.generate'
  | 'margin.read'
  | 'finance.read'
  | 'finance.manage'
  | 'compliance.read'
  | 'compliance.manage'
  | 'intelligence.read'
  | 'intelligence.act'
  | 'intelligence.buying'
  | 'intelligence.pricing'
  | 'intelligence.competitors'
  | 'intelligence.configure'
  | 'buying_signals.review'
  | 'buying_signals.accept'
  | 'pricing_signals.review'
  | 'pricing_signals.apply'
  | 'competitors.manage'
  | 'users.manage'
  | 'integrations.read'
  | 'integrations.manage'
  | 'advertising.read'
  | 'advertising.publish'
  | 'accounting.sync'
  | 'accounting.manage'
  | 'website.read'
  | 'website.edit'
  | 'website.publish'
  | 'website.branding'
  | 'website.domains'
  | 'website.analytics'
  | 'iq.ask'
  | 'iq.brief.read'
  | 'iq.recommendations.read'
  | 'iq.recommendations.review'
  | 'iq.actions.request'
  | 'iq.actions.approve'
  | 'iq.settings.read'
  | 'iq.settings.manage'
  | 'iq.automation.manage'
  | 'billing.manage'
  | 'settings.manage'

export const ROLE_PERMISSIONS_MAP: Record<string, PermissionKey[]> = {
  admin: [
    'stock.read', 'stock.create', 'stock.update', 'stock.delete', 'stock.costs', 'stock.publish',
    'customers.read', 'customers.create', 'customers.update', 'customers.delete',
    'leads.read', 'leads.create', 'leads.update', 'leads.assign', 'leads.respond',
    'deals.read', 'deals.create', 'deals.update', 'deals.discount', 'deals.approve_discount', 'deals.complete', 'deals.cancel',
    'part_exchange.read', 'part_exchange.manage', 'payments.read', 'payments.record', 'payments.refund',
    'handover.manage', 'documents.generate', 'margin.read', 'finance.read', 'finance.manage',
    'compliance.read', 'compliance.manage', 'intelligence.read', 'intelligence.act', 'intelligence.buying',
    'intelligence.pricing', 'intelligence.competitors', 'intelligence.configure', 'users.manage',
    'integrations.read', 'integrations.manage', 'advertising.read', 'advertising.publish',
    'accounting.sync', 'accounting.manage', 'website.read', 'website.edit', 'website.publish',
    'website.branding', 'website.domains', 'website.analytics', 'billing.manage', 'settings.manage'
  ],
  dealer_principal: [
    'stock.read', 'stock.create', 'stock.update', 'stock.delete', 'stock.costs', 'stock.publish',
    'customers.read', 'customers.create', 'customers.update', 'customers.delete',
    'leads.read', 'leads.create', 'leads.update', 'leads.assign', 'leads.respond',
    'deals.read', 'deals.create', 'deals.update', 'deals.discount', 'deals.approve_discount', 'deals.complete', 'deals.cancel',
    'part_exchange.read', 'part_exchange.manage', 'payments.read', 'payments.record', 'payments.refund',
    'handover.manage', 'documents.generate', 'margin.read', 'finance.read', 'finance.manage',
    'compliance.read', 'compliance.manage', 'intelligence.read', 'intelligence.act', 'intelligence.buying',
    'intelligence.pricing', 'intelligence.competitors', 'intelligence.configure', 'users.manage',
    'integrations.read', 'integrations.manage', 'advertising.read', 'advertising.publish',
    'accounting.sync', 'accounting.manage', 'website.read', 'website.edit', 'website.publish',
    'website.branding', 'website.domains', 'website.analytics', 'billing.manage', 'settings.manage'
  ],
  sales: [
    'stock.read', 'stock.create', 'stock.update', 'stock.publish',
    'customers.read', 'customers.create', 'customers.update',
    'leads.read', 'leads.create', 'leads.update', 'leads.respond',
    'deals.read', 'deals.create', 'deals.update', 'deals.discount',
    'part_exchange.read', 'part_exchange.manage', 'payments.read', 'payments.record',
    'handover.manage', 'documents.generate', 'advertising.read'
  ],
  sales_executive: [
    'stock.read', 'stock.create', 'stock.update', 'stock.publish',
    'customers.read', 'customers.create', 'customers.update',
    'leads.read', 'leads.create', 'leads.update', 'leads.respond',
    'deals.read', 'deals.create', 'deals.update', 'deals.discount',
    'part_exchange.read', 'part_exchange.manage', 'payments.read', 'payments.record',
    'handover.manage', 'documents.generate', 'advertising.read'
  ],
  buyer: [
    'stock.read', 'stock.create', 'stock.update', 'stock.costs',
    'intelligence.read', 'intelligence.buying', 'intelligence.pricing', 'intelligence.competitors',
    'margin.read'
  ],
  finance: [
    'deals.read', 'deals.update', 'finance.read', 'finance.manage', 'compliance.read',
    'compliance.manage', 'payments.read', 'payments.record', 'documents.generate'
  ],
};

/**
 * Synchronous permission check against canonical role matrix.
 */
export function checkRolePermission(role: string, permission: PermissionKey): boolean {
  if (role === 'admin' || role === 'dealer_principal') return true;
  const permissions = ROLE_PERMISSIONS_MAP[role] || [];
  return permissions.includes(permission);
}

/**
 * Check if the current authenticated user has a specific permission in their dealership.
 */
export async function hasPermission(dealershipId: string, userId: string, permission: PermissionKey): Promise<boolean> {
  const supabase = await createClient()

  // 1. Get user profile role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .eq('dealership_id', dealershipId)
    .single()

  if (!profile?.role) return false

  return checkRolePermission(profile.role, permission)
}

/**
 * Enforce permission check or throw ForbiddenError.
 */
export async function requirePermission(dealershipId: string, userId: string, permission: PermissionKey): Promise<void> {
  const allowed = await hasPermission(dealershipId, userId, permission)
  if (!allowed) {
    throw new ForbiddenError(`Missing required permission: ${permission}`)
  }
}
