import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

// We need to return a stream, so Edge runtime is often better, but for Next.js 15
// App Router, we can just return a new Response with a ReadableStream
export const runtime = 'nodejs'

export async function POST(req: Request) {
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

    const { messages } = await req.json()
    const dealershipId = profile.dealership_id

    if (!process.env.ANTHROPIC_API_KEY) {
      // Return a mock streaming response if no key
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()
          const text = "I am a simulated AI response because no Anthropic API key was found in the environment variables. Please add one to use the real chat functionality."
          
          for (let i = 0; i < text.length; i++) {
            controller.enqueue(encoder.encode(text[i]))
            await new Promise(r => setTimeout(r, 20))
          }
          controller.close()
        }
      })
      return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    // Fetch context
    const [stockRes, salesRes, marketRes, dealershipRes, signalsRes, leadsRes] = await Promise.all([
      supabase.from('vehicles').select('make, model, asking_price, purchase_price, prep_cost, transport_cost, created_at, status').eq('dealership_id', dealershipId),
      supabase.from('vehicles').select('make, model, sold_price, purchase_price, prep_cost, transport_cost, created_at, sold_at').eq('dealership_id', dealershipId).eq('status', 'sold').order('sold_at', { ascending: false }).limit(30),
      supabase.from('market_data').select('*').eq('dealership_id', dealershipId).order('demand_score', { ascending: false }).limit(10),
      supabase.from('dealerships').select('name, city, county').eq('id', dealershipId).single(),
      supabase.from('buying_signals').select('make, model, demand_score').eq('dealership_id', dealershipId).eq('status', 'active'),
      supabase.from('leads').select('id, status').eq('dealership_id', dealershipId)
    ])

    // Calculate some basic stats
    const activeLeadsCount = leadsRes.data?.filter(l => l.status !== 'won' && l.status !== 'lost').length || 0
    const wonLeadsCount = leadsRes.data?.filter(l => l.status === 'won').length || 0
    const totalClosedLeads = wonLeadsCount + (leadsRes.data?.filter(l => l.status === 'lost').length || 0)
    const conversionRate = totalClosedLeads > 0 ? (wonLeadsCount / totalClosedLeads) * 100 : 0

    const systemPrompt = `You are the ForecourIQ Intelligence Analyst for ${dealershipRes.data?.name}, ${dealershipRes.data?.city}.
    
CURRENT STOCK:
${JSON.stringify(stockRes.data)}

RECENT PERFORMANCE (Sold vehicles):
${JSON.stringify(salesRes.data)}

ACTIVE LEADS: ${activeLeadsCount}, ${conversionRate.toFixed(1)}% conversion rate

BUYING SIGNALS ACTIVE: ${signalsRes.data?.length || 0}
${JSON.stringify(signalsRes.data)}

REGIONAL MARKET (${dealershipRes.data?.county}):
${JSON.stringify(marketRes.data)}

Be direct, specific, and commercially focused.
Reference the dealer's actual data in every response. Never be vague.
Keep responses concise unless specifically asked for a detailed breakdown.
Format any currency as £X,XXX.
Format your output using Markdown.`

    const stream = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1000,
      system: systemPrompt,
      messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
      stream: true,
    })

    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }
        } catch (error) {
          console.error('Streaming error:', error)
          controller.enqueue(encoder.encode("\n\n[Error communicating with AI]"))
        } finally {
          controller.close()
        }
      }
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })

  } catch (error: any) {
    console.error('Chat API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
