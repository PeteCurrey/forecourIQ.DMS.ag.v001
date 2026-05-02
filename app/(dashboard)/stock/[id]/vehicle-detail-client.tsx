'use client'

import { formatCurrency, formatRegistration } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Image as ImageIcon, ChevronDown, ChevronUp, Share2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { differenceInDays, format } from 'date-fns'
import { cn } from '@/lib/utils'

export default function VehicleDetailClient({ vehicle, expenses, leads }: { vehicle: any, expenses: any[], leads: any[] }) {
  const [activePhoto, setActivePhoto] = useState(vehicle.primary_photo_index || 0)
  const [costExpanded, setCostExpanded] = useState(false)

  const totalCost = (vehicle.purchase_price || 0) + (vehicle.prep_cost || 0) + (vehicle.transport_cost || 0) + 
    expenses.reduce((acc, curr) => acc + Number(curr.amount), 0)
  const margin = (vehicle.asking_price || 0) - totalCost
  const marginPercent = vehicle.asking_price > 0 ? (margin / vehicle.asking_price) * 100 : 0
  const days = differenceInDays(new Date(), new Date(vehicle.created_at))

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="bg-carbon border-b border-steel sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/stock" className="text-pewter hover:text-cream transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[13px] text-cream bg-asphalt border border-steel px-2 py-1 rounded-[2px]">
              {formatRegistration(vehicle.registration)}
            </span>
            <h1 className="font-syne font-bold text-xl text-cream">
              {vehicle.make} {vehicle.model}
            </h1>
            <Badge variant={
              vehicle.status === 'available' ? 'default' :
              vehicle.status === 'reserved' ? 'warning' :
              vehicle.status === 'sold' ? 'positive' : 'secondary'
            }>
              {vehicle.status}
            </Badge>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" size="sm" className="gap-2 text-pewter hover:text-cream hidden sm:flex">
            <Share2 size={14} /> SHARE
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Edit size={14} /> EDIT VEHICLE
          </Button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 xl:grid-cols-12 gap-8 max-w-[1600px] mx-auto">
        
        {/* LEFT COLUMN - 7/12 */}
        <div className="xl:col-span-7 space-y-8">
          
          {/* Gallery */}
          <div className="space-y-4">
            <div className="aspect-[16/9] bg-carbon border border-steel rounded-[2px] overflow-hidden flex items-center justify-center">
              {vehicle.photos && vehicle.photos.length > 0 ? (
                <img src={vehicle.photos[activePhoto]} alt={`${vehicle.make} ${vehicle.model}`} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={64} className="text-steel" />
              )}
            </div>
            
            {vehicle.photos && vehicle.photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {vehicle.photos.map((photo: string, idx: number) => (
                  <button 
                    key={idx}
                    onClick={() => setActivePhoto(idx)}
                    className={cn(
                      "flex-shrink-0 w-24 aspect-[4/3] rounded-[2px] overflow-hidden border-2 transition-colors",
                      activePhoto === idx ? "border-blue" : "border-steel hover:border-slate"
                    )}
                  >
                    <img src={photo} alt="Thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Specs Grid */}
          <div className="bg-carbon border border-steel rounded-[2px] p-6">
            <h2 className="font-syne font-bold text-lg text-cream mb-4">Specifications</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
              {[
                { label: 'YEAR', value: vehicle.year },
                { label: 'MILEAGE', value: `${vehicle.mileage.toLocaleString()} mi` },
                { label: 'VARIANT', value: vehicle.variant || '-' },
                { label: 'COLOUR', value: vehicle.colour || '-' },
                { label: 'FUEL', value: vehicle.fuel_type || '-' },
                { label: 'TRANS', value: vehicle.transmission || '-' },
                { label: 'BODY', value: vehicle.body_type || '-' },
                { label: 'ENGINE', value: vehicle.engine_size || '-' },
                { label: 'MOT EXP', value: vehicle.mot_expiry ? format(new Date(vehicle.mot_expiry), 'MMM yyyy') : '-' },
                { label: 'CONDITION', value: vehicle.condition || '-' },
                { label: 'SERVICE', value: vehicle.service_history || '-' },
                { label: 'HPI', value: vehicle.hpi_clear ? 'CLEAR' : 'CHECK REQUIRED' },
              ].map((spec, idx) => (
                <div key={idx} className="border-b border-steel/50 pb-2">
                  <p className="font-mono text-[10px] text-pewter uppercase tracking-wider mb-1">{spec.label}</p>
                  <p className="font-inter font-medium text-[13px] text-cream truncate">{spec.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Highlights & Description */}
          <div className="space-y-6">
            {vehicle.highlights && vehicle.highlights.length > 0 && (
              <div>
                <h2 className="font-syne font-bold text-lg text-cream mb-3">Highlights</h2>
                <ul className="space-y-2">
                  {vehicle.highlights.map((highlight: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-silver font-inter text-sm">
                      <span className="text-blue mt-1.5 leading-none">•</span>
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {vehicle.description && (
              <div>
                <h2 className="font-syne font-bold text-lg text-cream mb-3">Description</h2>
                <div className="font-serif italic text-[17px] leading-relaxed text-silver whitespace-pre-wrap">
                  {vehicle.description}
                </div>
              </div>
            )}
          </div>
          
          {/* Cost Breakdown */}
          <div className="bg-carbon border border-steel rounded-[2px] overflow-hidden">
            <button 
              onClick={() => setCostExpanded(!costExpanded)}
              className="w-full flex items-center justify-between p-6 bg-carbon hover:bg-asphalt transition-colors"
            >
              <h2 className="font-syne font-bold text-lg text-cream">Cost Breakdown</h2>
              {costExpanded ? <ChevronUp size={20} className="text-pewter" /> : <ChevronDown size={20} className="text-pewter" />}
            </button>
            
            {costExpanded && (
              <div className="px-6 pb-6 border-t border-steel pt-4 space-y-3 font-mono text-[13px]">
                <div className="flex justify-between text-silver">
                  <span>Purchase Price</span>
                  <span>{formatCurrency(vehicle.purchase_price)}</span>
                </div>
                <div className="flex justify-between text-silver">
                  <span>Transport Cost</span>
                  <span>{formatCurrency(vehicle.transport_cost)}</span>
                </div>
                <div className="flex justify-between text-silver">
                  <span>Prep/Recon Estimate</span>
                  <span>{formatCurrency(vehicle.prep_cost)}</span>
                </div>
                
                {expenses.length > 0 && (
                  <div className="pt-2 border-t border-steel/50">
                    <p className="text-[10px] text-pewter uppercase tracking-wider mb-2">Logged Expenses</p>
                    {expenses.map((exp: any) => (
                      <div key={exp.id} className="flex justify-between text-silver pl-4 mb-1 relative before:content-[''] before:absolute before:left-0 before:top-2 before:w-2 before:h-[1px] before:bg-steel">
                        <span>{exp.category || 'General'} <span className="text-muted text-[11px]">({format(new Date(exp.date), 'dd/MM/yy')})</span></span>
                        <span>{formatCurrency(exp.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex justify-between text-cream font-bold pt-4 border-t border-steel mt-4">
                  <span>Total Cost to Dealership</span>
                  <span>{formatCurrency(totalCost)}</span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN - 5/12 */}
        <div className="xl:col-span-5 space-y-6">
          
          {/* Main Pricing Card */}
          <div className="bg-carbon border border-steel p-6 rounded-[2px] sticky top-24">
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="font-mono text-[11px] text-pewter uppercase tracking-widest mb-1">Asking Price</p>
                <p className="font-syne font-bold text-[48px] leading-none text-cream">{formatCurrency(vehicle.asking_price)}</p>
              </div>
              
              <div className="text-right">
                <p className="font-mono text-[11px] text-pewter uppercase tracking-widest mb-1">Status</p>
                <Badge variant={
                  vehicle.status === 'available' ? 'default' :
                  vehicle.status === 'reserved' ? 'warning' :
                  vehicle.status === 'sold' ? 'positive' : 'secondary'
                }>
                  {vehicle.status}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-4 pb-6 border-b border-steel">
              <div>
                <p className="font-mono text-[11px] text-pewter uppercase tracking-widest mb-1">Total Cost</p>
                <p className="font-mono text-[14px] text-silver">{formatCurrency(totalCost)}</p>
              </div>
              <div className="w-px h-8 bg-steel"></div>
              <div>
                <p className="font-mono text-[11px] text-pewter uppercase tracking-widest mb-1">Est. Margin</p>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "font-mono text-[16px] font-bold",
                    margin > 0 ? "text-positive" : "text-negative"
                  )}>
                    {margin > 0 ? '+' : ''}{formatCurrency(margin)}
                  </span>
                  <span className={cn(
                    "font-mono text-[11px]",
                    margin > 0 ? "text-positive" : "text-negative"
                  )}>
                    ({marginPercent.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>

            <div className="py-6 border-b border-steel">
              <div className="flex justify-between items-end mb-2">
                <p className="font-mono text-[11px] text-pewter uppercase tracking-widest">Days on Plot</p>
                <p className="font-inter text-[12px] text-silver">Listed {format(new Date(vehicle.created_at), 'dd MMM yy')}</p>
              </div>
              
              <div className="flex items-end gap-3 mb-3">
                <span className={cn(
                  "font-mono text-[40px] leading-none font-bold",
                  days < 25 ? "text-positive" : days < 45 ? "text-warning" : "text-negative"
                )}>
                  {days}
                </span>
                <span className="font-mono text-[13px] text-silver mb-1">days</span>
              </div>
              
              {/* Status Bar */}
              <div className="h-1.5 w-full bg-steel rounded-full overflow-hidden flex">
                <div className="h-full bg-positive" style={{ width: Math.min(100, Math.max(0, (25 - days) / 25 * 100)) + '%' }}></div>
                <div className="h-full bg-warning" style={{ width: Math.min(100, Math.max(0, (days > 25 ? Math.min(20, days - 25) : 0) / 20 * 100)) + '%' }}></div>
                <div className="h-full bg-negative" style={{ width: Math.min(100, Math.max(0, (days > 45 ? days - 45 : 0) / 45 * 100)) + '%' }}></div>
              </div>
            </div>

            <div className="pt-6 space-y-3">
              {vehicle.status === 'available' ? (
                <>
                  <Button className="w-full" variant="outline">LOG EXPENSE</Button>
                  <Button className="w-full border-warning text-warning hover:bg-warning/10" variant="outline">MARK AS RESERVED</Button>
                  <Button className="w-full bg-positive hover:bg-positive/90 text-void font-bold" variant="primary">MARK AS SOLD</Button>
                </>
              ) : (
                <Button className="w-full" variant="outline">REVERT TO AVAILABLE</Button>
              )}
            </div>

          </div>

          {/* Enquiries Panel */}
          <div className="bg-carbon border border-steel p-6 rounded-[2px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-syne font-bold text-lg text-cream">Enquiries</h2>
              <span className="font-mono text-[11px] bg-asphalt border border-steel px-2 py-0.5 rounded-[2px] text-silver">{leads.length}</span>
            </div>
            
            <div className="space-y-2">
              {leads.length > 0 ? leads.slice(0, 5).map((lead: any) => (
                <Link key={lead.id} href={`/leads/${lead.id}`} className="flex justify-between items-center p-3 bg-asphalt border border-steel rounded-[2px] hover:border-slate transition-colors group">
                  <div>
                    <p className="font-inter text-[13px] font-medium text-cream group-hover:text-blue transition-colors">{lead.first_name} {lead.last_name}</p>
                    <p className="font-mono text-[10px] text-pewter mt-0.5">{format(new Date(lead.created_at), 'dd MMM yyyy')}</p>
                  </div>
                  <Badge variant={lead.status === 'won' ? 'positive' : lead.status === 'lost' ? 'negative' : 'outline'}>{lead.status}</Badge>
                </Link>
              )) : (
                <p className="font-inter text-[13px] text-pewter text-center py-4">No enquiries yet.</p>
              )}
            </div>
            
            {leads.length > 5 && (
              <Button variant="ghost" className="w-full mt-4 text-xs">VIEW ALL {leads.length} LEADS</Button>
            )}
          </div>
          
        </div>
      </div>
    </div>
  )
}
