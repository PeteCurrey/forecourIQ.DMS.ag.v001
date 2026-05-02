'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'

export default function StepDealership({ dealership, onComplete }: { dealership: any, onComplete: () => void }) {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: dealership?.name || '',
      address_line1: dealership?.address_line1 || '',
      city: dealership?.city || '',
      county: dealership?.county || '',
      postcode: dealership?.postcode || '',
      phone: dealership?.phone || '',
      email: dealership?.email || '',
    }
  })

  async function onSubmit(data: any) {
    setIsLoading(true)
    const { error } = await supabase
      .from('dealerships')
      .update(data)
      .eq('id', dealership.id)

    if (error) {
      toast.error(error.message)
      setIsLoading(false)
      return
    }

    onComplete()
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="font-syne italic font-semibold text-6xl text-cream leading-[1.1] tracking-tight">
          Tell us about your dealership.
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <div className="space-y-2 md:col-span-2">
            <label className="font-mono text-[11px] text-pewter uppercase tracking-widest">Dealership Name</label>
            <Input {...register('name', { required: true })} className="bg-carbon border-steel h-12" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="font-mono text-[11px] text-pewter uppercase tracking-widest">Address Line 1</label>
            <Input {...register('address_line1', { required: true })} className="bg-carbon border-steel h-12" />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-[11px] text-pewter uppercase tracking-widest">City</label>
            <Input {...register('city', { required: true })} className="bg-carbon border-steel h-12" />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-[11px] text-pewter uppercase tracking-widest">County</label>
            <Input {...register('county', { required: true })} className="bg-carbon border-steel h-12" />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-[11px] text-pewter uppercase tracking-widest">Postcode</label>
            <Input {...register('postcode', { required: true })} className="bg-carbon border-steel h-12 uppercase" />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-[11px] text-pewter uppercase tracking-widest">Phone Number</label>
            <Input {...register('phone', { required: true })} className="bg-carbon border-steel h-12" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="font-mono text-[11px] text-pewter uppercase tracking-widest">Public Email (Sales)</label>
            <Input {...register('email', { required: true })} className="bg-carbon border-steel h-12" />
          </div>
        </div>

        <div className="pt-8">
          <Button 
            type="submit" 
            className="h-14 px-12 border-blue text-blue hover:bg-blue hover:text-void font-syne font-bold text-lg"
            variant="outline"
            disabled={isLoading}
          >
            {isLoading ? 'SAVING...' : 'Continue →'}
          </Button>
        </div>
      </form>
    </div>
  )
}
