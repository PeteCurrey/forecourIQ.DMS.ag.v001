import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { WebsiteService } from '@/lib/services/website/website-service'
import { PublicStockService } from '@/lib/services/website/public-stock'
import VehicleGallery from '@/components/website/vehicle-gallery'
import VehicleSpecs from '@/components/website/vehicle-specs'
import EnquiryForm from '@/components/website/enquiry-form'
import FinanceCTA from '@/components/website/finance-cta'
import { ShieldCheck, Phone, CheckCircle, ChevronLeft, Calendar, Tag, CreditCard } from 'lucide-react'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const headersList = await headers()
  const dealershipId = headersList.get('x-dealership-id')
  const supabase = await createClient()

  let targetId = dealershipId
  if (!targetId) {
    const { data: demo } = await supabase.from('dealerships').select('id').limit(1).maybeSingle()
    targetId = demo?.id
  }

  if (!targetId) return { title: 'Vehicle Details' }

  const website = await WebsiteService.getOrCreate(targetId)
  const websiteConfig = {
    online_reservations_enabled: website.online_reservations_enabled,
    reservation_deposit_amount: website.reservation_deposit_amount,
    show_registration: website.show_registration,
    reserved_vehicle_policy: website.reserved_vehicle_policy,
  }

  const vehicle = await PublicStockService.getBySlug(targetId, slug, websiteConfig)
  if (!vehicle) return { title: 'Vehicle Not Found' }

  const title = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.variant || ''} | For Sale`
  const description = vehicle.website_description
    ? vehicle.website_description.slice(0, 160)
    : `Quality inspected ${vehicle.year} ${vehicle.make} ${vehicle.model} with ${vehicle.mileage?.toLocaleString()} miles. Available now with finance.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: vehicle.primary_image_url ? [{ url: vehicle.primary_image_url }] : [],
    },
  }
}

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const headersList = await headers()
  const dealershipId = headersList.get('x-dealership-id')
  const supabase = await createClient()

  let targetId = dealershipId
  if (!targetId) {
    const { data: demo } = await supabase.from('dealerships').select('id').limit(1).maybeSingle()
    targetId = demo?.id
  }

  if (!targetId) notFound()

  const dealer = await WebsiteService.getPublicDealer(targetId)
  const website = await WebsiteService.getOrCreate(targetId)
  const websiteConfig = {
    online_reservations_enabled: website.online_reservations_enabled,
    reservation_deposit_amount: website.reservation_deposit_amount,
    show_registration: website.show_registration,
    reserved_vehicle_policy: website.reserved_vehicle_policy,
  }

  const vehicle = await PublicStockService.getBySlug(targetId, slug, websiteConfig)
  if (!vehicle) notFound()

  const formattedPrice = vehicle.asking_price_display
    ? vehicle.asking_price_display
    : vehicle.asking_price > 0
    ? `£${vehicle.asking_price.toLocaleString()}`
    : 'POA'

  // Schema.org Vehicle Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Car',
    name: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    image: vehicle.images.map((i) => i.url),
    brand: { '@type': 'Brand', name: vehicle.make },
    model: vehicle.model,
    vehicleModelDate: vehicle.year,
    mileageFromOdometer: {
      '@type': 'QuantitativeValue',
      value: vehicle.mileage,
      unitCode: 'SMI',
    },
    fuelType: vehicle.fuel_type,
    vehicleTransmission: vehicle.transmission,
    offers: {
      '@type': 'Offer',
      price: vehicle.asking_price,
      priceCurrency: 'GBP',
      availability:
        vehicle.status === 'available' || vehicle.status === 'advertised'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/SoldOut',
      seller: {
        '@type': 'AutoDealer',
        name: dealer?.name,
        telephone: dealer?.phone,
      },
    },
  }

  return (
    <div className="bg-gray-50/50 py-8 min-h-screen">
      {/* JSON-LD Script */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Back breadcrumb */}
        <div>
          <Link
            href="/used-cars"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to All Used Cars</span>
          </Link>
        </div>

        {/* Top Header Block */}
        <div className="bg-white rounded-2xl border border-gray-200/90 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-sky-600 uppercase tracking-wider">
                {vehicle.make}
              </span>
              {vehicle.status === 'reserved' && (
                <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                  Reserved
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h1>
            {vehicle.variant && (
              <p className="text-sm text-gray-500 font-medium">{vehicle.variant}</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="text-left sm:text-right">
              <div className="text-3xl font-extrabold text-gray-900 tracking-tight">
                {formattedPrice}
              </div>
              <div className="text-xs text-gray-500">Retail cash price</div>
            </div>

            {vehicle.is_reservable && (
              <Link
                href={`/used-cars/${vehicle.slug}/reserve`}
                className="px-5 py-3 text-xs font-bold text-white rounded-xl transition-opacity hover:opacity-90 shadow-md flex items-center justify-center gap-2 shrink-0"
                style={{ backgroundColor: dealer?.primary_colour || '#0EA5E9' }}
              >
                <CreditCard className="w-4 h-4" />
                <span>Reserve Online (£{vehicle.reservation_deposit ?? 299})</span>
              </Link>
            )}
          </div>
        </div>

        {/* 2-Column Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left / Main Column (Gallery + Specs) */}
          <div className="lg:col-span-2 space-y-6">
            <VehicleGallery
              images={vehicle.images}
              make={vehicle.make}
              model={vehicle.model}
              year={vehicle.year}
            />

            <VehicleSpecs vehicle={vehicle} />
          </div>

          {/* Right Column (Enquiry + Finance + Trust) */}
          <div className="space-y-6">
            <EnquiryForm
              dealershipSlug={dealer?.slug || ''}
              vehicleSlug={vehicle.slug}
              vehicleTitle={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              primaryColour={dealer?.primary_colour}
            />

            <FinanceCTA vehicle={vehicle} primaryColour={dealer?.primary_colour} />

            {/* Dealer Contact Card */}
            <div className="bg-white rounded-2xl border border-gray-200/90 p-6 shadow-sm space-y-3 text-xs">
              <h4 className="font-bold text-gray-900 text-sm">Need help or advice?</h4>
              <p className="text-gray-500">
                Our sales team is on hand to answer questions, arrange video viewings or discuss finance terms.
              </p>
              {dealer?.phone && (
                <a
                  href={`tel:${dealer.phone}`}
                  className="flex items-center gap-2 font-bold text-gray-900 text-sm hover:text-sky-600 pt-1"
                >
                  <Phone className="w-4 h-4 text-sky-500" />
                  <span>{dealer.phone}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
