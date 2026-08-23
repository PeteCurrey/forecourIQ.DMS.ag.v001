import { createClient } from '@/lib/supabase/server'
import { AuditService } from '@/lib/services/audit'

export interface WebsiteDomain {
  id: string
  dealership_id: string
  website_id: string
  domain: string
  is_primary: boolean
  status: 'pending' | 'verification_required' | 'verified' | 'ssl_pending' | 'active' | 'error'
  ssl_status: string | null
  dns_instructions: Record<string, unknown>
  verified_at: string | null
  error_message: string | null
  redirect_to: string | null
  created_at: string
  updated_at: string
}

export const DomainService = {
  async getDomains(dealershipId: string): Promise<WebsiteDomain[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('website_domains')
      .select('*')
      .eq('dealership_id', dealershipId)
      .order('is_primary', { ascending: false })

    if (error) throw new Error(`DomainService.getDomains: ${error.message}`)
    return (data ?? []) as WebsiteDomain[]
  },

  /**
   * Add a new domain with uniqueness protection.
   * Two dealerships cannot claim the same active domain.
   */
  async addDomain(
    dealershipId: string,
    websiteId: string,
    userId: string,
    domain: string,
    isPrimary = true
  ): Promise<WebsiteDomain> {
    const supabase = await createClient()

    // Check for conflict across all dealerships
    const { data: conflict } = await supabase
      .from('website_domains')
      .select('id, dealership_id')
      .eq('domain', domain)
      .in('status', ['verified', 'ssl_pending', 'active'])
      .neq('dealership_id', dealershipId)
      .maybeSingle()

    if (conflict) {
      throw new Error(`Domain "${domain}" is already in use by another dealership.`)
    }

    const dnsInstructions = {
      type: 'CNAME',
      name: domain.startsWith('www.') ? domain : `www.${domain}`,
      value: 'cname.vercel-dns.com',
      note: 'Point your domain DNS to this address. SSL will be provisioned automatically after verification.',
    }

    const { data, error } = await supabase
      .from('website_domains')
      .insert({
        dealership_id: dealershipId,
        website_id: websiteId,
        domain: domain.toLowerCase().trim(),
        is_primary: isPrimary,
        status: 'pending',
        dns_instructions: dnsInstructions,
      })
      .select('*')
      .single()

    if (error) throw new Error(`DomainService.addDomain: ${error.message}`)

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'website.domain_added',
      entity_type: 'website_domain',
      entity_id: data.id,
      metadata: { domain },
    })

    return data as WebsiteDomain
  },

  async updateDomain(
    domainId: string,
    dealershipId: string,
    updates: Partial<Pick<WebsiteDomain, 'status' | 'ssl_status' | 'verified_at' | 'error_message' | 'is_primary'>>
  ): Promise<WebsiteDomain> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('website_domains')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', domainId)
      .eq('dealership_id', dealershipId)
      .select('*')
      .single()

    if (error) throw new Error(`DomainService.updateDomain: ${error.message}`)
    return data as WebsiteDomain
  },

  async deleteDomain(domainId: string, dealershipId: string, userId: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('website_domains')
      .delete()
      .eq('id', domainId)
      .eq('dealership_id', dealershipId)

    if (error) throw new Error(`DomainService.deleteDomain: ${error.message}`)

    await AuditService.log({
      dealership_id: dealershipId,
      user_id: userId,
      action: 'website.domain_removed',
      entity_type: 'website_domain',
      entity_id: domainId,
    })
  },

  /**
   * Resolve dealership ID from Host header for public website routing.
   * Called in middleware for custom domain resolution.
   */
  async resolveDealershipByHost(host: string): Promise<string | null> {
    const supabase = await createClient()

    const cleanHost = host.split(':')[0].toLowerCase()

    const { data } = await supabase
      .from('website_domains')
      .select('dealership_id')
      .eq('domain', cleanHost)
      .eq('status', 'active')
      .maybeSingle()

    return data?.dealership_id ?? null
  },
}
