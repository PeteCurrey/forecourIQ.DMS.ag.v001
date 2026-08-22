import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AIService } from '@/lib/services/ai'
import { toApiErrorResponse, AuthenticationError, NotFoundError, IntegrationUnavailableError } from '@/lib/errors'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new AuthenticationError()
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('dealership_id')
      .eq('id', user.id)
      .single()

    if (!profile?.dealership_id) {
      throw new NotFoundError('Dealership profile')
    }

    const dealershipId = profile.dealership_id

    if (!AIService.isAvailable()) {
      throw new IntegrationUnavailableError('Anthropic AI', 'unconfigured')
    }

    // Fetch real context data
    const [stockRes, salesRes, marketRes, dealershipRes] = await Promise.all([
      supabase.from('vehicles').select('make, model, year, asking_price, status, created_at').eq('dealership_id', dealershipId).eq('status', 'available'),
      supabase.from('vehicles').select('make, model, year, sold_price, created_at, sold_at').eq('dealership_id', dealershipId).eq('status', 'sold').order('sold_at', { ascending: false }).limit(20),
      supabase.from('market_data').select('*').eq('dealership_id', dealershipId),
      supabase.from('dealerships').select('name, city, county').eq('id', dealershipId).single()
    ])

    const rawSignals = await AIService.generateBuyingSignals(
      {
        dealershipId,
        userId: user.id,
        capability: 'IQ_RECOMMEND',
        purpose: 'generate_buying_signals',
      },
      {
        name: dealershipRes.data?.name || 'Dealership',
        city: dealershipRes.data?.city || 'UK',
        county: dealershipRes.data?.county || 'UK',
        currentStock: stockRes.data || [],
        recentSales: salesRes.data || [],
        marketData: marketRes.data || [],
      }
    )

    const dateStr = new Date().toISOString().split('T')[0]

    // Dismiss existing signals for today
    await supabase
      .from('buying_signals')
      .update({ status: 'dismissed', dismissed_reason: 'regenerated' })
      .eq('dealership_id', dealershipId)
      .eq('generated_date', dateStr)
      .eq('status', 'active')

    // Insert new real AI-generated signals
    const signalsToInsert = (rawSignals as Record<string, unknown>[]).map(s => ({
      dealership_id: dealershipId,
      generated_date: dateStr,
      ...s,
      status: 'active',
    }))

    const { data: insertedSignals, error } = await supabase
      .from('buying_signals')
      .insert(signalsToInsert)
      .select()

    if (error) throw error

    return NextResponse.json({ signals: insertedSignals })
  } catch (error: unknown) {
    const { body: errBody, status: errStatus } = toApiErrorResponse(error)
    return NextResponse.json(errBody, { status: errStatus })
  }
}
