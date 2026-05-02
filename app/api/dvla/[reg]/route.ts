import { NextResponse } from 'next/server'

// MOCK DVLA API for demo purposes
export async function GET(request: Request, { params }: { params: { reg: string } }) {
  const reg = params.reg.toUpperCase().replace(/\s+/g, '')
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800))

  // Some mock data based on common regs or just random
  const mockData: Record<string, any> = {
    'DN21XYZ': {
      make: 'BMW',
      model: 'M4',
      year: 2021,
      colour: 'BLACK',
      fuel_type: 'PETROL',
      engine_size: '2993cc',
      transmission: 'AUTOMATIC',
      mot_expiry: '2025-09-15',
    },
    'LD70AVK': {
      make: 'BMW',
      model: '3 SERIES',
      year: 2021,
      colour: 'BLUE',
      fuel_type: 'DIESEL',
      engine_size: '1995cc',
      transmission: 'AUTOMATIC',
      mot_expiry: '2025-03-12',
    }
  }

  const result = mockData[reg] || {
    make: 'AUDI',
    model: 'A4',
    year: 2020,
    colour: 'GREY',
    fuel_type: 'DIESEL',
    engine_size: '1968cc',
    transmission: 'AUTOMATIC',
    mot_expiry: '2025-01-01',
  }

  return NextResponse.json(result)
}
