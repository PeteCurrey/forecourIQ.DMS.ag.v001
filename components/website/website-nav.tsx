'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Phone, Menu, X, Car } from 'lucide-react'
import type { PublicDealer } from '@/lib/types/public-website'

export default function WebsiteNav({ dealer }: { dealer: PublicDealer }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const navLinks = [
    { label: 'Used Cars', href: '/used-cars' },
    { label: 'Finance', href: '/finance' },
    { label: 'Part Exchange', href: '/part-exchange' },
    { label: 'Sell Your Car', href: '/sell-your-car' },
    { label: 'About Us', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ]

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo / Brand Name */}
          <Link href="/" className="flex items-center gap-3">
            {dealer.logo_url ? (
              <img
                src={dealer.logo_url}
                alt={dealer.name}
                className="h-10 w-auto object-contain"
              />
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm"
                  style={{ backgroundColor: dealer.primary_colour }}
                >
                  <Car className="w-5 h-5" />
                </div>
                <span className="text-xl font-bold text-gray-900 tracking-tight">
                  {dealer.name}
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Phone CTA / Stock count */}
          <div className="hidden md:flex items-center gap-4">
            {dealer.phone && (
              <a
                href={`tel:${dealer.phone}`}
                className="flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-gray-700 transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: dealer.primary_colour }}
                >
                  <Phone className="w-4 h-4" />
                </div>
                <span>{dealer.phone}</span>
              </a>
            )}
            <Link
              href="/used-cars"
              className="px-4 py-2 text-xs font-semibold text-white rounded-lg transition-opacity hover:opacity-90 shadow-sm"
              style={{ backgroundColor: dealer.primary_colour }}
            >
              Browse Stock ({dealer.stock_count})
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 pt-4 pb-6 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              {link.label}
            </Link>
          ))}
          {dealer.phone && (
            <div className="pt-3 border-t border-gray-100">
              <a
                href={`tel:${dealer.phone}`}
                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-900"
              >
                <Phone className="w-4 h-4 text-gray-500" />
                <span>{dealer.phone}</span>
              </a>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
