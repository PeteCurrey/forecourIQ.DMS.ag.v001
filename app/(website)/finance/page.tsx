import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { WebsiteService } from '@/lib/services/website/website-service'
import EnquiryForm from '@/components/website/enquiry-form'
import { Calculator, ShieldCheck, CheckCircle, Award, HelpCircle } from 'lucide-react'

export async function generateMetadata() {
  return {
    title: 'Vehicle Finance Options | Competitive HP & PCP Deals',
    description: 'Explore flexible car finance options. We work with leading automotive lenders to provide competitive Hire Purchase and PCP packages.',
  }
}

export default async function FinancePage() {
  const headersList = await headers()
  const dealershipId = headersList.get('x-dealership-id')
  const supabase = await createClient()

  let targetId = dealershipId
  if (!targetId) {
    const { data: demo } = await supabase.from('dealerships').select('id').limit(1).maybeSingle()
    targetId = demo?.id
  }

  const dealer = targetId ? await WebsiteService.getPublicDealer(targetId) : null

  return (
    <div className="bg-gray-50/50 py-12 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-3 py-1 rounded-full">
            <Calculator className="w-3.5 h-3.5" />
            <span>Automotive Finance</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Flexible Car Finance Tailored to You
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            Financing your next car shouldn&apos;t be complicated. We work with a comprehensive panel of trusted automotive finance specialists to offer clear, affordable payment plans.
          </p>
        </div>

        {/* 2 Finance Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* HP */}
          <div className="bg-white rounded-3xl border border-gray-200/90 p-8 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-lg">
              HP
            </div>
            <h3 className="text-xl font-bold text-gray-900">Hire Purchase (HP)</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              A straightforward way to spread the total cost of the vehicle. You pay an initial deposit, followed by fixed monthly payments. Once all payments and the option-to-purchase fee are paid, you own the car.
            </p>
            <ul className="space-y-2 text-xs text-gray-700 pt-2 border-t border-gray-100">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Fixed monthly payments throughout agreement</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>No mileage restrictions or excess mileage charges</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>You own the car at the end of the agreement</span>
              </li>
            </ul>
          </div>

          {/* PCP */}
          <div className="bg-white rounded-3xl border border-gray-200/90 p-8 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
              PCP
            </div>
            <h3 className="text-xl font-bold text-gray-900">Personal Contract Purchase (PCP)</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Enjoy lower monthly payments by deferring a portion of the car&apos;s value to an optional final balloon payment (Guaranteed Minimum Future Value). Perfect if you prefer changing your vehicle regularly.
            </p>
            <ul className="space-y-2 text-xs text-gray-700 pt-2 border-t border-gray-100">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Lower monthly payments compared to standard HP</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Flexibility at the end: buy, trade in or hand back</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Protection against unexpected depreciation</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Enquiry Section */}
        <div className="max-w-2xl mx-auto">
          <EnquiryForm
            dealershipSlug={dealer?.slug || ''}
            vehicleTitle="Car Finance Query"
            primaryColour={dealer?.primary_colour}
          />
        </div>

        {/* Regulatory Disclosure */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-xs text-gray-500 space-y-2">
          <div className="flex items-center gap-2 font-bold text-gray-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>FCA Regulatory Status & Commission Disclosure</span>
          </div>
          <p className="leading-relaxed">
            {dealer?.name} is authorised and regulated by the Financial Conduct Authority. We act as a credit broker, not a lender. We can introduce you to a limited number of finance providers based on your credit profile. Lenders may pay us a fixed fee or a percentage commission for introducing you. Finance is subject to status, age and affordability checks.
          </p>
        </div>
      </div>
    </div>
  )
}
