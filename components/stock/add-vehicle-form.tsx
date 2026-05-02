'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { vehicleSchema } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Search, ChevronRight, Loader2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { FUEL_TYPES, TRANSMISSIONS, BODY_TYPES } from '@/lib/constants'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import MarginCalculator from './margin-calculator'
import PhotoUploader from './photo-uploader'

export default function AddVehicleForm() {
  const router = useRouter()
  const supabase = createClient()
  
  const [step, setStep] = useState(1)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const methods = useForm({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      registration: '',
      make: '',
      model: '',
      variant: '',
      year: new Date().getFullYear(),
      mileage: 0,
      colour: '',
      fuel_type: 'Petrol',
      transmission: 'Automatic',
      body_type: 'SUV',
      doors: 5,
      engine_size: '',
      mot_expiry: '',
      service_history: 'unknown',
      hpi_clear: true,
      condition: 'good',
      purchase_price: 0,
      asking_price: 0,
      status: 'available',
      description: '',
      highlights: [],
    }
  })

  const { register, handleSubmit, setValue, watch, formState: { errors } } = methods
  const regValue = watch('registration')

  const handleLookup = async () => {
    if (!regValue) {
      toast.error('Please enter a registration number')
      return
    }

    setIsLookingUp(true)
    try {
      const res = await fetch(`/api/dvla/${regValue}`)
      if (!res.ok) throw new Error('Vehicle not found')
      
      const data = await res.json()
      
      setValue('make', data.make || '')
      setValue('model', data.model || '') // DVLA often doesn't give a clean model, but we set what we can
      setValue('year', data.yearOfManufacture || new Date().getFullYear())
      setValue('colour', data.colour || '')
      setValue('fuel_type', data.fuelType === 'DIESEL' ? 'Diesel' : data.fuelType === 'ELECTRIC' ? 'Electric' : 'Petrol')
      setValue('engine_size', data.engineCapacity ? `${(data.engineCapacity / 1000).toFixed(1)}L` : '')
      setValue('mot_expiry', data.motExpiryDate || '')
      
      toast.success('Vehicle found via DVLA')
      setStep(2)
    } catch (error) {
      toast.error('Could not find vehicle. Please enter manually.')
      setStep(2) // Move to manual entry anyway
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
        
      if (!profile?.dealership_id) throw new Error('No dealership associated')

      // Insert vehicle
      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .insert({
          dealership_id: profile.dealership_id,
          ...data,
          // Handle highlights string array properly (if it's not already)
          highlights: Array.isArray(data.highlights) ? data.highlights : [],
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Vehicle added successfully')
      router.push(`/stock/${vehicle.id}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to add vehicle')
    } finally {
      setIsSaving(false)
    }
  }

  const steps = [
    { num: 1, label: 'REG' },
    { num: 2, label: 'DETAILS' },
    { num: 3, label: 'PRICING' },
    { num: 4, label: 'PHOTOS' },
    { num: 5, label: 'PUBLISH' },
  ]

  return (
    <div className="max-w-5xl mx-auto w-full pb-20">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center mb-12">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center">
            <div className={cn(
              "font-mono text-[11px] tracking-widest",
              step === s.num ? "text-blue" : step > s.num ? "text-positive" : "text-pewter"
            )}>
              0{s.num} {s.label}
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                "w-8 sm:w-16 h-px mx-4",
                step > s.num ? "bg-positive" : "bg-steel"
              )} />
            )}
          </div>
        ))}
      </div>

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          
          {/* STEP 1: REG LOOKUP */}
          {step === 1 && (
            <div className="max-w-md mx-auto text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="font-syne font-bold text-3xl text-cream mb-2">Enter Registration</h2>
              <p className="font-inter text-sm text-silver mb-8">We'll fetch the vehicle details from the DVLA.</p>
              
              <div className="bg-[#F5C518] p-4 rounded-[4px] mb-6 shadow-lg shadow-black/50">
                <input
                  {...register('registration')}
                  placeholder="AB12 CDE"
                  className="w-full bg-transparent text-[#1A1A1A] font-mono font-bold text-4xl text-center placeholder:text-black/30 focus:outline-none uppercase"
                  autoFocus
                />
              </div>
              
              <div className="space-y-4">
                <Button 
                  type="button" 
                  onClick={handleLookup} 
                  disabled={isLookingUp}
                  className="w-full"
                >
                  {isLookingUp ? <Loader2 className="animate-spin mr-2" size={16} /> : <Search className="mr-2" size={16} />}
                  LOOK UP VEHICLE
                </Button>
                
                <button 
                  type="button"
                  onClick={() => setStep(2)}
                  className="font-inter text-sm text-blue hover:underline"
                >
                  Enter details manually →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: DETAILS */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-syne font-bold text-2xl text-cream">Vehicle Details</h2>
                <div className="font-mono text-sm text-cream bg-asphalt border border-steel px-3 py-1 rounded-[2px] uppercase">
                  {regValue || 'NO REG'}
                </div>
              </div>
              
              <div className="bg-carbon border border-steel p-6 rounded-[2px] mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">Make *</label>
                    <Input {...register('make')} placeholder="e.g. BMW" />
                    {errors.make && <p className="text-negative text-xs">{errors.make.message as string}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">Model *</label>
                    <Input {...register('model')} placeholder="e.g. X5" />
                    {errors.model && <p className="text-negative text-xs">{errors.model.message as string}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">Variant</label>
                    <Input {...register('variant')} placeholder="e.g. xDrive40d M Sport" />
                  </div>
                  <div className="space-y-2">
                    <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">Year *</label>
                    <Input {...register('year', { valueAsNumber: true })} type="number" />
                    {errors.year && <p className="text-negative text-xs">{errors.year.message as string}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">Mileage *</label>
                    <Input {...register('mileage', { valueAsNumber: true })} type="number" />
                    {errors.mileage && <p className="text-negative text-xs">{errors.mileage.message as string}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">Colour</label>
                    <Input {...register('colour')} placeholder="e.g. Mineral White" />
                  </div>

                  <div className="space-y-2">
                    <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">Fuel Type</label>
                    <select {...register('fuel_type')} className="w-full h-11 bg-asphalt border border-steel rounded-[2px] px-4 font-inter text-sm text-cream focus:outline-none focus:border-blue">
                      {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">Transmission</label>
                    <select {...register('transmission')} className="w-full h-11 bg-asphalt border border-steel rounded-[2px] px-4 font-inter text-sm text-cream focus:outline-none focus:border-blue">
                      {TRANSMISSIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">Description</label>
                    <textarea 
                      {...register('description')} 
                      className="w-full h-32 bg-asphalt border border-steel rounded-[2px] p-4 font-inter text-sm text-cream placeholder:text-muted focus:outline-none focus:border-blue resize-none"
                      placeholder="Detailed vehicle description..."
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button type="button" variant="ghost" onClick={() => setStep(1)}>← BACK</Button>
                <Button type="button" onClick={() => setStep(3)}>CONTINUE TO PRICING →</Button>
              </div>
            </div>
          )}

          {/* STEP 3: PRICING */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
              <h2 className="font-syne font-bold text-2xl text-cream mb-6">Pricing & Margins</h2>
              
              <MarginCalculator />
              
              <div className="flex justify-between mt-8">
                <Button type="button" variant="ghost" onClick={() => setStep(2)}>← BACK</Button>
                <Button type="button" onClick={() => setStep(4)}>CONTINUE TO PHOTOS →</Button>
              </div>
            </div>
          )}

          {/* STEP 4: PHOTOS */}
          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
              <h2 className="font-syne font-bold text-2xl text-cream mb-6">Photos</h2>
              
              <PhotoUploader />
              
              <div className="flex justify-between mt-8">
                <Button type="button" variant="ghost" onClick={() => setStep(3)}>← BACK</Button>
                <Button type="button" onClick={() => setStep(5)}>CONTINUE TO PUBLISH →</Button>
              </div>
            </div>
          )}

          {/* STEP 5: PUBLISH */}
          {step === 5 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
              <h2 className="font-syne font-bold text-2xl text-cream mb-2">Publish Vehicle</h2>
              <p className="font-inter text-sm text-silver mb-8">Review details and select where to list this vehicle.</p>
              
              {/* Summary Card */}
              <div className="bg-carbon border border-steel p-6 rounded-[2px] mb-8">
                <div className="flex justify-between items-start mb-6 pb-6 border-b border-steel">
                  <div>
                    <h3 className="font-syne font-bold text-xl text-cream mb-1">
                      {watch('make')} {watch('model')} {watch('variant')}
                    </h3>
                    <p className="font-mono text-sm text-silver uppercase">{watch('registration')} · {watch('year')} · {watch('mileage')} mi</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-3xl text-cream">{formatCurrency(watch('asking_price'))}</p>
                    <p className="font-mono text-xs text-positive uppercase">EST MARGIN: {formatCurrency(Number(watch('asking_price')) - Number(watch('purchase_price')))}</p>
                  </div>
                </div>
                
                <h4 className="font-mono text-[11px] text-pewter uppercase tracking-wider mb-4">Publishing Destinations</h4>
                
                <div className="space-y-3">
                  {[
                    { id: 'autotrader', name: 'AutoTrader', connected: true },
                    { id: 'ebay', name: 'eBay Motors', connected: true },
                    { id: 'cargurus', name: 'CarGurus', connected: false },
                  ].map(platform => (
                    <div key={platform.id} className="flex items-center justify-between p-4 bg-asphalt border border-steel rounded-[2px]">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-2 h-2 rounded-full", platform.connected ? "bg-positive" : "bg-pewter")} />
                        <span className="font-syne font-bold text-sm text-cream">{platform.name}</span>
                        {!platform.connected && (
                          <span className="font-inter text-xs text-pewter">— Not connected</span>
                        )}
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" disabled={!platform.connected} defaultChecked={platform.connected} />
                        <div className="w-11 h-6 bg-steel peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-cream after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue peer-disabled:opacity-50"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button type="button" variant="ghost" onClick={() => setStep(4)}>← BACK</Button>
                <div className="flex gap-4">
                  <Button type="submit" disabled={isSaving} variant="outline" onClick={() => setValue('status', 'prep')}>
                    SAVE TO PREP
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Check className="mr-2" size={16} />}
                    PUBLISH VEHICLE
                  </Button>
                </div>
              </div>
            </div>
          )}

        </form>
      </FormProvider>
    </div>
  )
}
