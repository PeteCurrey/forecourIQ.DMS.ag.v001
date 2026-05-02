import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('dealership_id')
      .eq('id', user.id)
      .single()

    if (!profile?.dealership_id) {
      return NextResponse.json({ error: 'No dealership found' }, { status: 400 })
    }

    const dealershipId = profile.dealership_id

    // Check if Anthropic API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      // Return mock data if no key is provided
      return NextResponse.json({ 
        message: 'No Anthropic API key found. Returning mock signals.',
        signals: [] // Return empty or mock array
      })
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    // Fetch context data
    const [stockRes, salesRes, marketRes, dealershipRes] = await Promise.all([
      supabase.from('vehicles').select('make, model, year, asking_price, status, created_at').eq('dealership_id', dealershipId).eq('status', 'available'),
      supabase.from('vehicles').select('make, model, year, sold_price, created_at, sold_at').eq('dealership_id', dealershipId).eq('status', 'sold').order('sold_at', { ascending: false }).limit(20),
      supabase.from('market_data').select('*').eq('dealership_id', dealershipId),
      supabase.from('dealerships').select('name, city, county').eq('id', dealershipId).single()
    ])

    const prompt = `Generate 8 specific buying recommendations for ${dealershipRes.data?.name} based in ${dealershipRes.data?.city}, ${dealershipRes.data?.county}.
      
CURRENT STOCK (${stockRes.data?.length || 0} vehicles):
${JSON.stringify(stockRes.data)}

RECENT SALES (last 90 days):
${JSON.stringify(salesRes.data)}

REGIONAL MARKET DATA:
${JSON.stringify(marketRes.data)}

Generate recommendations that:
- Fill gaps in current stock relative to demand
- Prioritise makes/models with proven fast turn for this dealer
- Target vehicles with >£3,000 margin potential
- Are realistic for UK independent dealer purchase at auction or trade

Return ONLY a JSON array, no other text:
[{
  "make": string,
  "model": string,
  "year_min": number,
  "year_max": number,
  "fuel_type": string,
  "mileage_max": number,
  "target_buy_price": number,
  "projected_retail": number,
  "projected_margin": number,
  "days_to_sell_estimate": number,
  "demand_score": number, // (1-100)
  "reasoning": string // (2 sentences, specific to this dealer's data)
}]`

    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620", // using available sonnet model
      max_tokens: 2000,
      system: "You are a UK automotive market analyst specialising in independent dealer operations. You must respond with valid JSON only.",
      messages: [
        { role: "user", content: prompt }
      ]
    })

    let responseText = ""
    if (msg.content[0].type === 'text') {
        responseText = msg.content[0].text
    } else {
        throw new Error("Unexpected content type from Anthropic")
    }

    // Try to parse the JSON
    let newSignals = []
    try {
      // Find the first '[' and last ']' to extract just the JSON part
      const startIdx = responseText.indexOf('[')
      const endIdx = responseText.lastIndexOf(']') + 1
      if (startIdx !== -1 && endIdx !== 0) {
        newSignals = JSON.parse(responseText.substring(startIdx, endIdx))
      } else {
        newSignals = JSON.parse(responseText)
      }
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', responseText)
      throw new Error('Invalid JSON response from AI')
    }

    // Process and insert into DB
    const dateStr = new Date().toISOString().split('T')[0]
    
    // First, dismiss today's existing signals to replace them
    await supabase
      .from('buying_signals')
      .update({ status: 'dismissed', dismissed_reason: 'regenerated' })
      .eq('dealership_id', dealershipId)
      .eq('generated_date', dateStr)
      .eq('status', 'active')

    // Insert new signals
    const signalsToInsert = newSignals.map((s: any) => ({
      dealership_id: dealershipId,
      generated_date: dateStr,
      ...s,
      status: 'active'
    }))

    const { data: insertedSignals, error } = await supabase
      .from('buying_signals')
      .insert(signalsToInsert)
      .select()

    if (error) throw error

    return NextResponse.json({ signals: insertedSignals })

  } catch (error: any) {
    console.error('API Route Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
