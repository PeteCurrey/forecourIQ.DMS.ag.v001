import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://forecour-iq-dms-ag-v001.vercel.app'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/stock/',
          '/deals/',
          '/leads/',
          '/customers/',
          '/inbox/',
          '/tasks/',
          '/appointments/',
          '/settings/',
          '/website/',
          '/command-centre/',
          '/analytics/',
          '/*?*reservation_id=*',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
