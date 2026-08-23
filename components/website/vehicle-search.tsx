'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Search, RotateCcw, SlidersHorizontal } from 'lucide-react'

export default function VehicleSearch({
  availableMakes = [],
  priceRange = { min: 0, max: 100000 },
  primaryColour = '#0EA5E9',
}: {
  availableMakes?: string[]
  priceRange?: { min: number; max: number }
  primaryColour?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [make, setMake] = useState(searchParams.get('make') || '')
  const [model, setModel] = useState(searchParams.get('model') || '')
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '')
  const [fuelType, setFuelType] = useState(searchParams.get('fuel_type') || '')
  const [transmission, setTransmission] = useState(searchParams.get('transmission') || '')
  const [bodyType, setBodyType] = useState(searchParams.get('body_type') || '')
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest')

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const params = new URLSearchParams()
    if (make) params.set('make', make)
    if (model) params.set('model', model)
    if (maxPrice) params.set('max_price', maxPrice)
    if (fuelType) params.set('fuel_type', fuelType)
    if (transmission) params.set('transmission', transmission)
    if (bodyType) params.set('body_type', bodyType)
    if (sort && sort !== 'newest') params.set('sort', sort)

    router.push(`/used-cars?${params.toString()}`)
  }

  const handleReset = () => {
    setMake('')
    setModel('')
    setMaxPrice('')
    setFuelType('')
    setTransmission('')
    setBodyType('')
    setSort('newest')
    router.push('/used-cars')
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm">
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <SlidersHorizontal className="w-4 h-4" />
            <span>Search & Filter</span>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* Make */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Make</label>
            <select
              value={make}
              onChange={(e) => setMake(e.target.value)}
              className="w-full text-xs rounded-lg border border-gray-300 py-2 px-2.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Makes</option>
              {availableMakes.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Model */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Model</label>
            <input
              type="text"
              placeholder="e.g. Golf, A3, 3 Series"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full text-xs rounded-lg border border-gray-300 py-2 px-2.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Max Price */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Max Price</label>
            <select
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full text-xs rounded-lg border border-gray-300 py-2 px-2.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">No Max</option>
              <option value="5000">Up to £5,000</option>
              <option value="10000">Up to £10,000</option>
              <option value="15000">Up to £15,000</option>
              <option value="20000">Up to £20,000</option>
              <option value="25000">Up to £25,000</option>
              <option value="30000">Up to £30,000</option>
              <option value="40000">Up to £40,000</option>
              <option value="50000">Up to £50,000</option>
              <option value="75000">Up to £75,000</option>
            </select>
          </div>

          {/* Fuel */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Fuel Type</label>
            <select
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value)}
              className="w-full text-xs rounded-lg border border-gray-300 py-2 px-2.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Fuel Types</option>
              <option value="petrol">Petrol</option>
              <option value="diesel">Diesel</option>
              <option value="hybrid">Hybrid</option>
              <option value="electric">Electric</option>
            </select>
          </div>

          {/* Gearbox */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Gearbox</label>
            <select
              value={transmission}
              onChange={(e) => setTransmission(e.target.value)}
              className="w-full text-xs rounded-lg border border-gray-300 py-2 px-2.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Transmissions</option>
              <option value="manual">Manual</option>
              <option value="automatic">Automatic</option>
            </select>
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Body Style</label>
            <select
              value={bodyType}
              onChange={(e) => setBodyType(e.target.value)}
              className="w-full text-xs rounded-lg border border-gray-300 py-2 px-2.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Body Styles</option>
              <option value="hatchback">Hatchback</option>
              <option value="saloon">Saloon</option>
              <option value="estate">Estate</option>
              <option value="suv">SUV</option>
              <option value="coupe">Coupe</option>
              <option value="convertible">Convertible</option>
            </select>
          </div>

          {/* Search Button */}
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2 px-3 text-xs font-semibold text-white rounded-lg transition-opacity hover:opacity-90 shadow-sm flex items-center justify-center gap-1.5"
              style={{ backgroundColor: primaryColour }}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
