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
  | 'billing.manage'
  | 'settings.manage'

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

  // Dealer principal / admin have full operational rights
  if (profile.role === 'admin' || profile.role === 'dealer_principal') {
    return true
  }

  // 2. Query role_permissions
  const { data: rolePerm } = await supabase
    .from('role_permissions')
    .select('permission_id')
    .eq('role_id', profile.role)
    .eq('permission_id', permission)
    .maybeSingle()

  return !!rolePerm
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
