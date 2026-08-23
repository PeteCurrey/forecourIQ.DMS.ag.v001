import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { DealService } from '@/lib/services/deal'
import Link from 'next/link'
import {
  Car,
  User,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  ArrowLeft,
  FileCheck,
  Award,
} from 'lucide-react'

export const metadata = {
  title: 'Customer Handover Experience | ForecourIQ DMS',
}

export default async function DealHandoverPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) redirect('/onboarding')

  const [deal, dealershipRes] = await Promise.all([
    DealService.getById(profile.dealership_id, id),
    supabase.from('dealerships').select('name, phone, email, logo_url').eq('id', profile.dealership_id).single(),
  ])

  if (!deal) notFound()

  const dealership = dealershipRes.data

  return (
    <div className="min-h-screen bg-void text-cream p-6 md:p-12 max-w-4xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-steel pb-6">
        <Link
          href={`/deals/${deal.id}`}
          className="inline-flex items-center gap-2 text-xs font-mono text-pewter hover:text-cream transition"
        >
          <ArrowLeft size={14} /> Back to Deal Desk
        </Link>
        <span className="font-syne font-bold text-lg text-cream">
          {dealership?.name || 'ForecourIQ Handover Bay'}
        </span>
      </div>

      {/* Hero Welcome */}
      <div className="bg-carbon border border-steel p-8 rounded-[2px] text-center space-y-3">
        <div className="w-12 h-12 bg-blue/10 border border-blue/30 rounded-full flex items-center justify-center mx-auto text-blue mb-2">
          <Award size={24} />
        </div>
        <h1 className="font-syne font-bold text-2xl md:text-3xl text-cream tracking-tight">
          Vehicle Delivery & Handover
        </h1>
        <p className="text-silver text-sm max-w-md mx-auto">
          Welcome {deal.customers ? `${deal.customers.first_name} ${deal.customers.last_name}` : 'Valued Customer'}.
          Your vehicle has been thoroughly prepared and inspected.
        </p>
      </div>

      {/* Vehicle Specification Card */}
      <div className="bg-carbon border border-steel p-6 rounded-[2px] space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-steel/60">
          <div className="p-3 bg-asphalt border border-steel rounded-[2px] text-blue">
            <Car size={24} />
          </div>
          <div>
            <h2 className="font-syne font-bold text-xl text-cream">
              {deal.vehicles?.make} {deal.vehicles?.model} {deal.vehicles?.variant || ''}
            </h2>
            <span className="font-mono text-sm font-bold text-blue tracking-wider">
              {deal.vehicles?.registration}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono pt-2">
          <div className="bg-asphalt p-3 rounded-[2px] border border-steel/40">
            <span className="text-pewter uppercase text-[10px] block">Year</span>
            <span className="font-bold text-cream text-sm">{deal.vehicles?.year || '—'}</span>
          </div>
          <div className="bg-asphalt p-3 rounded-[2px] border border-steel/40">
            <span className="text-pewter uppercase text-[10px] block">Recorded Mileage</span>
            <span className="font-bold text-cream text-sm">
              {deal.vehicles?.mileage ? `${deal.vehicles.mileage.toLocaleString()} mi` : '—'}
            </span>
          </div>
          <div className="bg-asphalt p-3 rounded-[2px] border border-steel/40">
            <span className="text-pewter uppercase text-[10px] block">Colour</span>
            <span className="font-bold text-cream text-sm">{deal.vehicles?.colour || '—'}</span>
          </div>
          <div className="bg-asphalt p-3 rounded-[2px] border border-steel/40">
            <span className="text-pewter uppercase text-[10px] block">Handover Date</span>
            <span className="font-bold text-cream text-sm">
              {deal.handover_at ? new Date(deal.handover_at).toLocaleDateString('en-GB') : 'Today'}
            </span>
          </div>
        </div>
      </div>

      {/* Handover Quality Guarantees */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-carbon border border-steel p-4 rounded-[2px] space-y-2">
          <div className="flex items-center gap-2 text-positive font-semibold">
            <ShieldCheck size={16} /> Workshop Inspected
          </div>
          <p className="text-pewter text-[11px] leading-relaxed">
            Multi-point safety check completed prior to vehicle release.
          </p>
        </div>

        <div className="bg-carbon border border-steel p-4 rounded-[2px] space-y-2">
          <div className="flex items-center gap-2 text-positive font-semibold">
            <FileCheck size={16} /> Documentation Verified
          </div>
          <p className="text-pewter text-[11px] leading-relaxed">
            V5C logbook transfer and DVLA documentation prepared for signing.
          </p>
        </div>

        <div className="bg-carbon border border-steel p-4 rounded-[2px] space-y-2">
          <div className="flex items-center gap-2 text-positive font-semibold">
            <CheckCircle2 size={16} /> Valeted & Sanitised
          </div>
          <p className="text-pewter text-[11px] leading-relaxed">
            Full interior and exterior showroom preparation completed.
          </p>
        </div>
      </div>

      {/* Delivery Confirmation */}
      <div className="bg-carbon border border-steel p-6 rounded-[2px] text-center space-y-4">
        <h3 className="font-syne font-bold text-sm uppercase tracking-wide text-cream">
          Delivery Handover Acknowledgement
        </h3>
        <p className="text-xs text-silver max-w-md mx-auto">
          Please confirm vehicle inspection, receipt of all keys, service documentation, and vehicle handbook.
        </p>

        <div className="pt-2">
          <span className="font-mono text-xs text-pewter bg-asphalt px-4 py-2 rounded-[2px] border border-steel inline-block">
            Deal Reference: {deal.deal_reference || deal.id} · Status: {deal.status.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  )
}
