'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { vehicleSchema } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Search, Loader2, Check, ArrowLeft, ArrowRight, Building2, User, PoundSterling } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { FUEL_TYPES, TRANSMISSIONS, BODY_TYPES } from '@/lib/constants'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

const PURCHASE_SOURCES = [
  { id: 'auction', label: 'Auction House' },
  { id: 'part_exchange', label: 'Part Exchange' },
  { id: 'trade_purchase', label: 'Trade Purchase' },
  { id: 'private_purchase', label: 'Private Purchase' },
  { id: 'manufacturer', label: 'Manufacturer Direct' },
  { id: 'group_transfer', label: 'Group Transfer' },
  { id: 'other', label: 'Other Sourcing' },
]

interface LocationItem {
  id: string
  name: string
}

interface TeamItem {
  id: string
  full_name: string
}

export default function AddVehicleForm({
  locations = [],
  teamMembers = []
}: {
  locations?: LocationItem[]
  teamMembers?: TeamItem[]
}) {
  const router = useRouter()
  const supabase = createClient()
  
  const [step, setStep] = useState(1)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [dvlaStatusMessage, setDvlaStatusMessage] = useState<string | null>(null)
  
  const methods = useForm({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      registration: '',
      vin: '',
      make: '',
      model: '',
      variant: '',
      year: new Date().getFullYear(),
      mileage: 0,
      colour: '',
      fuel_type: 'Petrol',
      transmission: 'Automatic',
      body_type: 'Hatchback',
      doors: 5,
      engine_size: '',
      keys_count: 2,
      service_history_type: 'full',
      hpi_status: 'clear',
      condition: 'good',
      // Acquisition
      purchase_source: 'auction',
      supplier_name: '',
      auction_house: '',
      purchase_date: new Date().toISOString().split('T')[0],
      purchase_reference: '',
      funding_source: '',
      purchase_price: 0,
      auction_fee: 0,
      transport_cost: 0,
      prep_cost: 0,
      other_acquisition_costs: 0,
      // Operational
      location_id: locations[0]?.id || '',
      assigned_user_id: teamMembers[0]?.id || '',
      asking_price: 0,
      status: 'available',
      internal_notes: '',
      description: '',
      highlights: [],
    }
  })

  const { register, handleSubmit, setValue, watch, formState: { errors } } = methods
  const regValue = watch('registration')
  const purchasePrice = Number(watch('purchase_price') || 0)
  const auctionFee = Number(watch('auction_fee') || 0)
  const transportCost = Number(watch('transport_cost') || 0)
  const prepCost = Number(watch('prep_cost') || 0)
  const otherCosts = Number(watch('other_acquisition_costs') || 0)
  const askingPrice = Number(watch('asking_price') || 0)

  const totalInvested = purchasePrice + auctionFee + transportCost + prepCost + otherCosts
  const projectedMargin = askingPrice - totalInvested
  const marginPct = askingPrice > 0 ? (projectedMargin / askingPrice) * 100 : 0

  const handleLookup = async () => {
    if (!regValue || !regValue.trim()) {
      toast.error('Please enter a vehicle registration')
      return
    }

    setIsLookingUp(true)
    setDvlaStatusMessage(null)
    try {
      const res = await fetch('/api/vehicle-data/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration: regValue.trim().toUpperCase() }),
      })
      const result = await res.json()

      if (result.isManualFallback || !result.success) {
        setDvlaStatusMessage(result.error || 'DVLA lookup unconfigured. Please enter vehicle details manually below.')
        setStep(2)
        return
      }

      const data = result.data
      if (data) {
        if (data.make) setValue('make', data.make)
        if (data.model) setValue('model', data.model)
        if (data.year) setValue('year', data.year)
        if (data.colour) setValue('colour', data.colour)
        if (data.fuel_type) setValue('fuel_type', data.fuel_type)
        if (data.engine_capacity_cc) setValue('engine_size', `${(data.engine_capacity_cc / 1000).toFixed(1)}L`)
        toast.success(`DVLA data retrieved for ${data.registration}`)
      }
      setStep(2)
    } catch {
      setDvlaStatusMessage('Vehicle lookup unavailable — enter details manually.')
      setStep(2)
    } finally {
      setIsLookingUp(false)
    }
  }

  const onSubmit = async (data: any) => {
    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: profile } = await supabase
        .from('profiles')
        .select('dealership_id')
        .eq('id', user.id)
        .single()
        
      if (!profile?.dealership_id) throw new Error('No dealership associated with user')

      const payload = {
        dealership_id: profile.dealership_id,
        ...data,
        registration: data.registration.toUpperCase().replace(/\s+/g, ''),
        location_id: data.location_id || null,
        assigned_user_id: data.assigned_user_id || null,
        highlights: Array.isArray(data.highlights) ? data.highlights : [],
        created_at: new Date().toISOString(),
      }

      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to add vehicle')
      }

      const created = await res.json()
      toast.success('Vehicle added to stockbook')
      router.push(`/stock/${created.id}`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add vehicle')
    } finally {
      setIsSaving(false)
    }
  }

  const stages = [
    { num: 1, label: 'REGISTRATION' },
    { num: 2, label: 'VEHICLE SPECS' },
    { num: 3, label: 'ACQUISITION' },
    { num: 4, label: 'PRICING & STATUS' },
  ]

  return (
    <div className="max-w-4xl mx-auto w-full py-6 pb-24">
      
      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-10 overflow-x-auto">
        {stages.map((s, i) => (
          <div key={s.num} className="flex items-center">
            <button
              type="button"
              onClick={() => step > s.num && setStep(s.num)}
              className={cn(
                "font-mono text-[11px] uppercase tracking-wider flex items-center gap-2 transition-colors",
                step === s.num ? "text-blue font-bold" : step > s.num ? "text-positive" : "text-pewter"
              )}
            >
              <span className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px]",
                step === s.num ? "bg-blue text-void font-bold" : step > s.num ? "bg-positive/20 text-positive" : "bg-steel text-pewter"
              )}>
                {s.num}
              </span>
              {s.label}
            </button>
            {i < stages.length - 1 && (
              <div className={cn(
                "w-8 sm:w-12 h-px mx-3",
                step > s.num ? "bg-positive/50" : "bg-steel"
              )} />
            )}
          </div>
        ))}
      </div>

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          
          {/* STAGE 1: REGISTRATION */}
          {step === 1 && (
            <div className="max-w-md mx-auto text-center animate-in fade-in duration-300">
              <h2 className="font-syne font-bold text-[28px] text-cream mb-2">Add Vehicle to Stock</h2>
              <p className="font-inter text-sm text-silver mb-8">
                Enter registration to begin adding to your dealership stockbook.
              </p>
              
              <div className="bg-[#F5C518] p-4 rounded-[3px] mb-6 shadow-xl border border-black/20">
                <p className="font-mono text-[10px] text-black/60 font-bold uppercase tracking-widest text-left mb-1">GB</p>
                <input
                  {...register('registration')}
                  placeholder="AB12 CDE"
                  className="w-full bg-transparent text-[#111111] font-mono font-black text-4xl text-center placeholder:text-black/25 focus:outline-none uppercase tracking-wider"
                  autoFocus
                />
              </div>

              {dvlaStatusMessage && (
                <div className="bg-asphalt border border-warning/30 text-warning text-xs p-3 rounded-[2px] mb-6 text-left font-mono">
                  {dvlaStatusMessage}
                </div>
              )}
              
              <div className="space-y-4">
                <Button 
                  type="button" 
                  onClick={handleLookup} 
                  disabled={isLookingUp}
                  className="w-full h-11 text-sm font-mono tracking-wider"
                >
                  {isLookingUp ? <Loader2 className="animate-spin mr-2" size={16} /> : <Search className="mr-2" size={16} />}
                  LOOK UP REGISTRATION
                </Button>
                
                <button 
                  type="button"
                  onClick={() => setStep(2)}
                  className="font-inter text-xs text-pewter hover:text-cream transition-colors block mx-auto"
                >
                  Skip lookup & enter manually →
                </button>
              </div>
            </div>
          )}

          {/* STAGE 2: VEHICLE SPECIFICATIONS */}
          {step === 2 && (
            <div className="animate-in fade-in duration-300 space-y-6">
              <div className="flex items-center justify-between border-b border-steel pb-4">
                <div>
                  <h2 className="font-syne font-bold text-2xl text-cream">Vehicle Specifications</h2>
                  <p className="font-inter text-xs text-silver mt-0.5">Core vehicle attributes and condition.</p>
                </div>
                <span className="font-mono text-sm font-bold text-cream bg-asphalt border border-steel px-3 py-1 rounded-[2px] uppercase">
                  {regValue || 'NO REG'}
                </span>
              </div>

              {dvlaStatusMessage && (
                <div className="bg-asphalt border border-steel text-silver text-xs p-3 rounded-[2px] font-inter">
                  <span className="font-mono text-warning uppercase font-bold mr-2">Note:</span>
                  {dvlaStatusMessage}
                </div>
              )}

              <div className="bg-carbon border border-steel p-6 rounded-[2px] grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Registration *</label>
                  <Input {...register('registration')} className="font-mono uppercase font-bold" />
                  {errors.registration && <p className="text-negative text-xs">{errors.registration.message as string}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">VIN (Optional)</label>
                  <Input {...register('vin')} placeholder="17-character VIN" className="font-mono uppercase" />
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Make *</label>
                  <Input {...register('make')} placeholder="e.g. BMW" />
                  {errors.make && <p className="text-negative text-xs">{errors.make.message as string}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Model *</label>
                  <Input {...register('model')} placeholder="e.g. 3 Series" />
                  {errors.model && <p className="text-negative text-xs">{errors.model.message as string}</p>}
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Derivative / Variant</label>
                  <Input {...register('variant')} placeholder="e.g. 330e M Sport Pro Package Saloon" />
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Year of Manufacture *</label>
                  <Input {...register('year', { valueAsNumber: true })} type="number" />
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Current Mileage *</label>
                  <Input {...register('mileage', { valueAsNumber: true })} type="number" />
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Colour</label>
                  <Input {...register('colour')} placeholder="e.g. Mineral Grey" />
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Fuel Type</label>
                  <select {...register('fuel_type')} className="w-full h-10 bg-asphalt border border-steel rounded-[2px] px-3 font-inter text-sm text-cream focus:border-blue">
                    {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Transmission</label>
                  <select {...register('transmission')} className="w-full h-10 bg-asphalt border border-steel rounded-[2px] px-3 font-inter text-sm text-cream focus:border-blue">
                    {TRANSMISSIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Body Style</label>
                  <select {...register('body_type')} className="w-full h-10 bg-asphalt border border-steel rounded-[2px] px-3 font-inter text-sm text-cream focus:border-blue">
                    {BODY_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Engine Size / Badge</label>
                  <Input {...register('engine_size')} placeholder="e.g. 2.0L" />
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Service History</label>
                  <select {...register('service_history_type')} className="w-full h-10 bg-asphalt border border-steel rounded-[2px] px-3 font-inter text-sm text-cream focus:border-blue">
                    <option value="full">Full Service History</option>
                    <option value="part">Part Service History</option>
                    <option value="first_service_not_due">First Service Not Due</option>
                    <option value="none">No History</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Keys Count</label>
                  <Input {...register('keys_count', { valueAsNumber: true })} type="number" defaultValue={2} />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="gap-2">
                  <ArrowLeft size={14} /> BACK
                </Button>
                <Button type="button" onClick={() => setStep(3)} className="gap-2">
                  CONTINUE TO ACQUISITION <ArrowRight size={14} />
                </Button>
              </div>
            </div>
          )}

          {/* STAGE 3: ACQUISITION RECORD */}
          {step === 3 && (
            <div className="animate-in fade-in duration-300 space-y-6">
              <div className="border-b border-steel pb-4">
                <h2 className="font-syne font-bold text-2xl text-cream">Acquisition Details</h2>
                <p className="font-inter text-xs text-silver mt-0.5">
                  Record initial vehicle purchase costs, auction fees, and sourcing supplier.
                </p>
              </div>

              <div className="bg-carbon border border-steel p-6 rounded-[2px] grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Purchase Source</label>
                  <select {...register('purchase_source')} className="w-full h-10 bg-asphalt border border-steel rounded-[2px] px-3 font-inter text-sm text-cream focus:border-blue">
                    {PURCHASE_SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Supplier / Vendor Name</label>
                  <Input {...register('supplier_name')} placeholder="e.g. BCA Nottingham, Lookers Trade" />
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Purchase Date</label>
                  <Input {...register('purchase_date')} type="date" />
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Purchase Reference / Invoice #</label>
                  <Input {...register('purchase_reference')} placeholder="e.g. INV-98421" />
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Hammer / Purchase Price (£) *</label>
                  <Input {...register('purchase_price', { valueAsNumber: true })} type="number" step="0.01" />
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Auction Fee (£)</label>
                  <Input {...register('auction_fee', { valueAsNumber: true })} type="number" step="0.01" />
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Transport Cost (£)</label>
                  <Input {...register('transport_cost', { valueAsNumber: true })} type="number" step="0.01" />
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Other Acquisition Fees (£)</label>
                  <Input {...register('other_acquisition_costs', { valueAsNumber: true })} type="number" step="0.01" />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Funding Source (Optional)</label>
                  <Input {...register('funding_source')} placeholder="e.g. Stocking Plan, Own Capital" />
                </div>
              </div>

              {/* Acquisition Cost Summary Box */}
              <div className="bg-asphalt border border-steel p-4 rounded-[2px] flex items-center justify-between">
                <div>
                  <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Total Acquisition Cost</p>
                  <p className="font-mono text-xs text-silver mt-0.5">Hammer + Fees + Transport</p>
                </div>
                <p className="font-mono text-2xl font-bold text-cream">
                  {formatCurrency(purchasePrice + auctionFee + transportCost + otherCosts)}
                </p>
              </div>

              <div className="flex justify-between items-center">
                <Button type="button" variant="outline" onClick={() => setStep(2)} className="gap-2">
                  <ArrowLeft size={14} /> BACK
                </Button>
                <Button type="button" onClick={() => setStep(4)} className="gap-2">
                  CONTINUE TO PRICING & OPERATIONS <ArrowRight size={14} />
                </Button>
              </div>
            </div>
          )}

          {/* STAGE 4: OPERATIONAL & PRICING */}
          {step === 4 && (
            <div className="animate-in fade-in duration-300 space-y-6">
              <div className="border-b border-steel pb-4">
                <h2 className="font-syne font-bold text-2xl text-cream">Pricing & Operations</h2>
                <p className="font-inter text-xs text-silver mt-0.5">
                  Assign location, responsible buyer, arrival status and retail asking price.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-carbon border border-steel p-6 rounded-[2px] space-y-5">
                  <h3 className="font-syne font-bold text-base text-cream">Operational Assignment</h3>

                  {locations.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Dealership Location</label>
                      <select {...register('location_id')} className="w-full h-10 bg-asphalt border border-steel rounded-[2px] px-3 font-inter text-sm text-cream focus:border-blue">
                        {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                      </select>
                    </div>
                  )}

                  {teamMembers.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Assigned User / Buyer</label>
                      <select {...register('assigned_user_id')} className="w-full h-10 bg-asphalt border border-steel rounded-[2px] px-3 font-inter text-sm text-cream focus:border-blue">
                        {teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Initial Stock Status</label>
                    <select {...register('status')} className="w-full h-10 bg-asphalt border border-steel rounded-[2px] px-3 font-inter text-sm text-cream focus:border-blue">
                      <option value="available">Available for Sale</option>
                      <option value="inspection">In Inspection</option>
                      <option value="preparation">In Preparation</option>
                      <option value="in_transit">In Transit</option>
                      <option value="purchased">Purchased (Awaiting Transport)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Internal Notes</label>
                    <textarea 
                      {...register('internal_notes')} 
                      rows={3} 
                      className="w-full bg-asphalt border border-steel rounded-[2px] p-3 text-sm text-cream focus:border-blue resize-none"
                      placeholder="Notes for sales team or workshop..."
                    />
                  </div>
                </div>

                {/* Pricing & Commercial Economics */}
                <div className="bg-carbon border border-steel p-6 rounded-[2px] space-y-5 flex flex-col justify-between">
                  <div>
                    <h3 className="font-syne font-bold text-base text-cream mb-4">Retail Economics</h3>

                    <div className="space-y-1.5">
                      <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Retail Asking Price (£) *</label>
                      <Input {...register('asking_price', { valueAsNumber: true })} type="number" step="1" className="font-mono text-lg font-bold" />
                    </div>

                    <div className="mt-6 space-y-2 pt-4 border-t border-steel text-xs font-mono">
                      <div className="flex justify-between text-silver">
                        <span>Total Invested Cost:</span>
                        <span>{formatCurrency(totalInvested)}</span>
                      </div>
                      <div className="flex justify-between text-silver">
                        <span>Retail Asking Price:</span>
                        <span>{formatCurrency(askingPrice)}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-2 border-t border-steel/60">
                        <span className="text-cream uppercase">Projected Gross:</span>
                        <span className={projectedMargin > 0 ? "text-positive" : "text-negative"}>
                          {formatCurrency(projectedMargin)} ({marginPct.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-asphalt border border-steel p-3 rounded-[2px]">
                    <p className="font-inter text-xs text-silver">
                      Images and preparation jobs can be attached immediately after saving.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(3)} className="gap-2">
                  <ArrowLeft size={14} /> BACK
                </Button>
                <Button type="submit" disabled={isSaving} className="gap-2">
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                  SAVE TO STOCKBOOK
                </Button>
              </div>
            </div>
          )}

        </form>
      </FormProvider>
    </div>
  )
}
