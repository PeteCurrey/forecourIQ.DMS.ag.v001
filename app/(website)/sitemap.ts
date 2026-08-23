import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://forecour-iq-dms-ag-v001.vercel.app'
  const supabase = await createClient()

  // Base static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}`, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/used-cars`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/finance`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/part-exchange`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/sell-your-car`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/cookies`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ]

  // Dynamic live stock pages
  try {
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('website_slug, updated_at')
      .eq('website_ready', true)
      .in('status', ['advertised', 'available'])
      .not('website_slug', 'is', null)

    const vehicleUrls: MetadataRoute.Sitemap = (vehicles || []).map((v) => ({
      url: `${baseUrl}/used-cars/${v.website_slug}`,
      lastModified: new Date(v.updated_at || Date.now()),
      changeFrequency: 'daily',
      priority: 0.8,
    }))

    return [...staticPages, ...vehicleUrls]
  } catch {
    return staticPages
  }
}
