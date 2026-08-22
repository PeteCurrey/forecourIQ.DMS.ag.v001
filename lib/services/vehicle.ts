import { createClient } from '@/lib/supabase/server'
import { AuditService } from './audit'
import { NotFoundError, ValidationError } from '@/lib/errors'
import {
  VehicleLifecycleStatus,
  VehicleRecord,
  StockKPISummary,
  CommercialSummary,
  calculateCommercials,
  checkAdvertisingReadiness,
  exportToCSV
} from './vehicle-calc'

export type {
  VehicleLifecycleStatus,
  VehicleRecord,
  StockKPISummary,
  CommercialSummary
}
export {
  calculateCommercials,
  checkAdvertisingReadiness,
  exportToCSV
}

export interface VehicleListFilters {
  status?: VehicleLifecycleStatus | 'active_stock'
  location_id?: string
  assigned_user_id?: string
  make?: string
  min_price?: number
  max_price?: number
  search?: string
  sortBy?: 'created_at' | 'asking_price' | 'mileage' | 'days_in_stock'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export const VehicleService = {
  calculateCommercials,
  checkAdvertisingReadiness,
  exportToCSV,

  /**
   * List vehicles for a dealership with multi-dimensional filtering, searching, and pagination.
   */
  async list(dealershipId: string, filters: VehicleListFilters = {}) {
    const supabase = await createClient()

    let query = supabase
      .from('vehicles')
      .select('*, dealership_locations(name), profiles(full_name), vehicle_images(id, url, is_primary), preparation_jobs(id, title, status, actual_cost)', { count: 'exact' })
      .eq('dealership_id', dealershipId)

    if (filters.status) {
      if (filters.status === 'active_stock') {
        query = query.not('status', 'in', '("sold","completed","archived","returned")')
      } else {
        query = query.eq('status', filters.status)
      }
    }

    if (filters.location_id) query = query.eq('location_id', filters.location_id)
    if (filters.assigned_user_id) query = query.eq('assigned_user_id', filters.assigned_user_id)
    if (filters.make) query = query.ilike('make', `%${filters.make}%`)
    if (filters.min_price !== undefined) query = query.gte('asking_price', filters.min_price)
    if (filters.max_price !== undefined) query = query.lte('asking_price', filters.max_price)

    if (filters.search) {
      const term = filters.search.trim().replace(/\s+/g, '')
      query = query.or(
        `registration.ilike.%${term}%,vin.ilike.%${term}%,make.ilike.%${term}%,model.ilike.%${term}%,variant.ilike.%${term}%`
      )
    }

    const sortColumn = filters.sortBy || 'created_at'
    const sortAscending = filters.sortOrder === 'asc'
    query = query.order(sortColumn, { ascending: sortAscending })

    if (filters.limit) query = query.limit(filters.limit)
    if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)

    const { data, count, error } = await query
    if (error) throw error

    return {
      vehicles: (data || []) as VehicleRecord[],
      totalCount: count || 0,
    }
  },

  /**
   * Fetch single vehicle by ID ensuring tenant isolation.
   */
  async getById(dealershipId: string, vehicleId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('vehicles')
      .select(`
        *,
        dealership_locations (id, name),
        profiles (id, full_name, email),
        vehicle_images (*),
        preparation_jobs (*),
        vehicle_costs (*),
        vehicle_documents (*),
        vehicle_status_history (*),
        vehicle_price_history (*)
      `)
      .eq('dealership_id', dealershipId)
      .eq('id', vehicleId)
      .single()

    if (error || !data) throw new NotFoundError(`Vehicle ${vehicleId}`)

    return data as VehicleRecord & {
      dealership_locations?: { id: string; name: string } | null
      profiles?: { id: string; full_name: string; email: string } | null
      vehicle_images?: { id: string; url: string; is_primary: boolean }[] | null
      preparation_jobs?: { id: string; title: string; status: string; category: string; estimated_cost: number; actual_cost: number; supplier: string; due_date: string }[] | null
      vehicle_costs?: { id: string; category: string; description: string; amount: number; supplier_name: string; invoice_reference: string; incurred_date: string }[] | null
      vehicle_documents?: { id: string; filename: string; document_type: string; file_url: string; created_at: string }[] | null
      vehicle_status_history?: { from_status: string; to_status: string; reason: string; created_at: string }[] | null
      vehicle_price_history?: { old_price: number; new_price: number; reason: string; created_at: string }[] | null
    }
  },

  /**
   * Create a new vehicle in the stockbook.
   */
  async create(dealershipId: string, payload: Partial<VehicleRecord>, userId?: string) {
    const supabase = await createClient()

    if (!payload.registration) throw new ValidationError('Vehicle registration is required')
    if (!payload.make) throw new ValidationError('Vehicle make is required')
    if (!payload.model) throw new ValidationError('Vehicle model is required')

    const cleanReg = payload.registration.toUpperCase().replace(/\s+/g, '')

    const insertData = {
      dealership_id: dealershipId,
      registration: cleanReg,
      vin: payload.vin ? payload.vin.toUpperCase() : null,
      make: payload.make,
      model: payload.model,
      variant: payload.variant || null,
      year: payload.year || new Date().getFullYear(),
      mileage: Number(payload.mileage || 0),
      colour: payload.colour || null,
      fuel_type: payload.fuel_type || 'Petrol',
      transmission: payload.transmission || 'Automatic',
      body_type: payload.body_type || 'Hatchback',
      doors: payload.doors || null,
      engine_size: payload.engine_size || null,
      keys_count: payload.keys_count || 2,
      service_history_type: payload.service_history_type || 'full',
      hpi_status: payload.hpi_status || 'clear',
      condition: payload.condition || 'good',
      purchase_source: payload.purchase_source || 'auction',
      supplier_name: payload.supplier_name || null,
      auction_house: payload.auction_house || null,
      purchase_date: payload.purchase_date || new Date().toISOString().split('T')[0],
      purchase_reference: payload.purchase_reference || null,
      funding_source: payload.funding_source || null,
      purchase_price: Number(payload.purchase_price || 0),
      auction_fee: Number(payload.auction_fee || 0),
      transport_cost: Number(payload.transport_cost || 0),
      prep_cost: Number(payload.prep_cost || 0),
      other_acquisition_costs: Number(payload.other_acquisition_costs || 0),
      asking_price: Number(payload.asking_price || 0),
      location_id: payload.location_id || null,
      assigned_user_id: payload.assigned_user_id || userId || null,
      status: payload.status || 'available',
      internal_notes: payload.internal_notes || null,
      description: payload.description || null,
      advert_headline: payload.advert_headline || null,
      advert_description: payload.advert_description || null,
      highlights: payload.highlights || [],
      photos: payload.photos || [],
      advert_ready: false,
    }

    const { data: created, error } = await supabase
      .from('vehicles')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error

    // Initial Status History Entry
    await supabase.from('vehicle_status_history').insert({
      vehicle_id: created.id,
      from_status: null,
      to_status: created.status,
      reason: 'Initial creation in stockbook',
      changed_by: userId || null,
    })

    // Initial Price History Entry if asking price > 0
    if (created.asking_price > 0) {
      await supabase.from('vehicle_price_history').insert({
        vehicle_id: created.id,
        old_price: null,
        new_price: created.asking_price,
        reason: 'Initial retail asking price',
        changed_by: userId || null,
      })
    }

    // Initial Audit Log
    if (userId) {
      await AuditService.log({
        dealership_id: dealershipId,
        user_id: userId,
        action: 'vehicle.created',
        entity_type: 'vehicle',
        entity_id: created.id,
        after: { registration: cleanReg, make: created.make, model: created.model },
      })
    }

    return created as VehicleRecord
  },

  /**
   * Update vehicle attributes with audit logging, price history, and status progression.
   */
  async update(dealershipId: string, vehicleId: string, updates: Partial<VehicleRecord>, userId?: string, reason?: string) {
    const supabase = await createClient()
    const current = await this.getById(dealershipId, vehicleId)

    const isPriceChanged = updates.asking_price !== undefined && updates.asking_price !== current.asking_price
    const isStatusChanged = updates.status !== undefined && updates.status !== current.status

    const { data, error } = await supabase
      .from('vehicles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('dealership_id', dealershipId)
      .eq('id', vehicleId)
      .select()
      .single()

    if (error) throw error

    // Price History Record
    if (isPriceChanged && updates.asking_price !== undefined) {
      await supabase.from('vehicle_price_history').insert({
        vehicle_id: vehicleId,
        old_price: current.asking_price,
        new_price: updates.asking_price,
        reason: reason || 'Price adjusted',
        changed_by: userId,
      })

      await AuditService.log({
        dealership_id: dealershipId,
        user_id: userId,
        action: 'vehicle.price_changed',
        entity_type: 'vehicle',
        entity_id: vehicleId,
        before: { asking_price: current.asking_price },
        after: { asking_price: updates.asking_price },
      })
    }

    // Status History Record
    if (isStatusChanged && updates.status) {
      await supabase.from('vehicle_status_history').insert({
        vehicle_id: vehicleId,
        from_status: current.status,
        to_status: updates.status,
        reason: reason || 'Status updated in workflow',
        changed_by: userId,
      })

      await AuditService.log({
        dealership_id: dealershipId,
        user_id: userId,
        action: 'vehicle.status_changed',
        entity_type: 'vehicle',
        entity_id: vehicleId,
        before: { status: current.status },
        after: { status: updates.status },
      })
    }

    return data as VehicleRecord
  },

  /**
   * Derive live Stock KPIs computed strictly from database records.
   */
  async getStockKPIs(dealershipId: string): Promise<StockKPISummary> {
    const supabase = await createClient()
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('dealership_id', dealershipId)

    if (error) throw error

    const list = (vehicles || []) as VehicleRecord[]
    const now = Date.now()

    let totalRetailUnits = 0
    let totalStockValue = 0
    let totalRetailValue = 0
    let totalDays = 0
    let vehiclesOver45Days = 0
    let vehiclesOver60Days = 0
    let vehiclesInPreparation = 0
    let vehiclesReserved = 0

    const ageing = {
      under30: 0,
      days31to45: 0,
      days46to60: 0,
      days61to90: 0,
      over90: 0,
    }

    const availableStock = list.filter(v => !['sold', 'completed', 'archived', 'returned'].includes(v.status))

    availableStock.forEach(v => {
      totalRetailUnits++
      const invested = Number(v.purchase_price || 0) + Number(v.auction_fee || 0) + Number(v.transport_cost || 0) + Number(v.prep_cost || 0) + Number(v.other_acquisition_costs || 0)
      totalStockValue += invested
      totalRetailValue += Number(v.asking_price || 0)

      const pDate = v.purchase_date || v.created_at
      const days = Math.max(0, Math.floor((now - new Date(pDate).getTime()) / (1000 * 60 * 60 * 24)))
      totalDays += days

      if (days > 45) vehiclesOver45Days++
      if (days > 60) vehiclesOver60Days++

      if (days <= 30) ageing.under30++
      else if (days <= 45) ageing.days31to45++
      else if (days <= 60) ageing.days46to60++
      else if (days <= 90) ageing.days61to90++
      else ageing.over90++

      if (['inspection', 'preparation', 'photography'].includes(v.status)) vehiclesInPreparation++
      if (v.status === 'reserved') vehiclesReserved++
    })

    const potentialGrossMargin = totalRetailValue - totalStockValue
    const averageGrossMargin = totalRetailUnits > 0 ? potentialGrossMargin / totalRetailUnits : 0
    const averageDaysInStock = totalRetailUnits > 0 ? Math.round(totalDays / totalRetailUnits) : 0

    return {
      totalRetailUnits,
      totalStockValue,
      totalRetailValue,
      potentialGrossMargin,
      averageGrossMargin,
      averageDaysInStock,
      vehiclesOver45Days,
      vehiclesOver60Days,
      vehiclesInPreparation,
      vehiclesReserved,
      ageingBreakdown: ageing,
    }
  },
}
