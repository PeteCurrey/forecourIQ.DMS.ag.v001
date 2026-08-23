import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { WebsiteService } from '@/lib/services/website/website-service'
import EnquiryForm from '@/components/website/enquiry-form'
import { MapPin, Phone, Mail, Clock, MessageSquare } from 'lucide-react'

export async function generateMetadata() {
  return {
    title: 'Contact Us | Location, Opening Times & Enquiries',
    description: 'Get in touch with our team, find our showroom address and check current opening hours.',
  }
}

export default async function ContactPage() {
  const headersList = await headers()
  const dealershipId = headersList.get('x-dealership-id')
  const supabase = await createClient()

  let targetId = dealershipId
  if (!targetId) {
    const { data: demo } = await supabase.from('dealerships').select('id').limit(1).maybeSingle()
    targetId = demo?.id
  }

  const dealer = targetId ? await WebsiteService.getPublicDealer(targetId) : null
  const dealerName = dealer?.name || 'Our Showroom'

  return (
    <div className="bg-gray-50/50 py-12 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-3 py-1 rounded-full">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Get in Touch</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Contact & Showroom Location
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            We are here to help with all your vehicle and finance enquiries. Visit our showroom, call our team or send us a message below.
          </p>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Left: Contact Info + Hours */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-200/90 p-8 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-gray-900 pb-3 border-b border-gray-100">
                Showroom Details
              </h3>

              <div className="space-y-4 text-xs sm:text-sm">
                {dealer?.address_line1 && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Address</div>
                      <div className="text-gray-600">
                        {dealer.address_line1}
                        {dealer.city && `, ${dealer.city}`}
                        {dealer.county && `, ${dealer.county}`}
                        {dealer.postcode && ` ${dealer.postcode}`}
                      </div>
                    </div>
                  </div>
                )}

                {dealer?.phone && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Telephone</div>
                      <a href={`tel:${dealer.phone}`} className="text-gray-600 hover:text-sky-600 font-medium">
                        {dealer.phone}
                      </a>
                    </div>
                  </div>
                )}

                {dealer?.email && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Email Address</div>
                      <a href={`mailto:${dealer.email}`} className="text-gray-600 hover:text-sky-600 font-medium">
                        {dealer.email}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Opening Hours */}
              <div className="pt-6 border-t border-gray-100 space-y-3">
                <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
                  <Clock className="w-4 h-4 text-sky-600" />
                  <span>Opening Hours</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="font-medium text-gray-800">Monday – Friday</span>
                    <span>09:00 – 18:00</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="font-medium text-gray-800">Saturday</span>
                    <span>09:00 – 17:00</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="font-medium text-gray-800">Sunday</span>
                    <span>10:00 – 16:00</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="font-medium text-gray-800">Bank Holidays</span>
                    <span>By Appointment</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Message Form */}
          <div>
            <EnquiryForm
              dealershipSlug={dealer?.slug || ''}
              primaryColour={dealer?.primary_colour}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
