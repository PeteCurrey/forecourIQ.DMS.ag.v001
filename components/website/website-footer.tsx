import Link from 'next/link'
import { MapPin, Phone, Mail, ShieldCheck } from 'lucide-react'
import type { PublicDealer } from '@/lib/types/public-website'

export default function WebsiteFooter({ dealer }: { dealer: PublicDealer }) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-gray-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand & Address */}
          <div className="space-y-4">
            <div className="text-white font-bold text-lg tracking-tight">
              {dealer.name}
            </div>
            {dealer.address_line1 && (
              <div className="flex items-start gap-2 text-xs leading-relaxed">
                <MapPin className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                <span>
                  {dealer.address_line1}
                  {dealer.city && `, ${dealer.city}`}
                  {dealer.postcode && `, ${dealer.postcode}`}
                </span>
              </div>
            )}
            {dealer.phone && (
              <div className="flex items-center gap-2 text-xs">
                <Phone className="w-4 h-4 text-gray-500 shrink-0" />
                <a href={`tel:${dealer.phone}`} className="hover:text-white transition-colors">
                  {dealer.phone}
                </a>
              </div>
            )}
            {dealer.email && (
              <div className="flex items-center gap-2 text-xs">
                <Mail className="w-4 h-4 text-gray-500 shrink-0" />
                <a href={`mailto:${dealer.email}`} className="hover:text-white transition-colors">
                  {dealer.email}
                </a>
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-4">
              Inventory & Services
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/used-cars" className="hover:text-white transition-colors">
                  Used Cars for Sale
                </Link>
              </li>
              <li>
                <Link href="/finance" className="hover:text-white transition-colors">
                  Car Finance Options
                </Link>
              </li>
              <li>
                <Link href="/part-exchange" className="hover:text-white transition-colors">
                  Part Exchange Valuation
                </Link>
              </li>
              <li>
                <Link href="/sell-your-car" className="hover:text-white transition-colors">
                  Sell Your Car to Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Dealership Info */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-4">
              About & Support
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About {dealer.name}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact Us & Location
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-white transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>

          {/* Regulatory Notice */}
          <div className="space-y-3">
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-4">
              Regulatory Information
            </h4>
            {dealer.fca_number ? (
              <div className="flex items-start gap-2 text-xs bg-gray-800/60 p-3 rounded-lg border border-gray-800">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-gray-300">
                  {dealer.name} is authorised and regulated by the Financial Conduct Authority (FCA Ref: {dealer.fca_number}).
                </span>
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                Finance subject to status. Terms and conditions apply.
              </p>
            )}
            <p className="text-[11px] text-gray-500 leading-relaxed">
              We act as a credit broker, not a lender. We work with a panel of lenders and may receive a commission for introducing you.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>© {currentYear} {dealer.name}. All rights reserved.</p>
          <div className="flex items-center gap-1 text-[11px]">
            <span>Powered by</span>
            <span className="font-semibold text-gray-400">ForecourIQ</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
