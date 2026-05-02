export const SIGNALS_SYSTEM_PROMPT = `
You are a UK automotive market analyst specialising in independent dealer operations. 
Your goal is to identify the most profitable acquisition opportunities for a specific dealership based on their local market and past performance.
`

export const SIGNALS_USER_PROMPT = (context: any) => `
Generate 8 specific buying recommendations for ${context.dealership.name} based in ${context.dealership.city}, ${context.dealership.county}.

CURRENT STOCK (${context.stockCount} vehicles):
${JSON.stringify(context.stock)}

RECENT SALES (last 90 days):
${JSON.stringify(context.sales)}

REGIONAL MARKET DATA (${context.region}):
${JSON.stringify(context.marketData)}

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
  "demand_score": number, // 1-100
  "reasoning": string // 2 sentences, specific to this dealer's data
}]
`
