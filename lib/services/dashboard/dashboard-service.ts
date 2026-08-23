import { createClient } from '@/lib/supabase/server';
import { VehicleService } from '@/lib/services/vehicle';
import { DealService } from '@/lib/services/deal';
import { BuyingService } from '@/lib/services/intelligence/buying-service';
import { PricingService } from '@/lib/services/intelligence/pricing-service';
import { TransferService } from '@/lib/services/transfers/transfer-service';
import { ChatService } from '@/lib/services/chat/chat-service';
import { checkRolePermission } from '@/lib/rbac/permissions';
import { subDays, format } from 'date-fns';

export interface DashboardGauge {
  id: string;
  label: string;
  percentage: number;
  numerator: number;
  denominator: number;
  denominatorContext: string;
  status: 'good' | 'warning' | 'critical';
}

export interface AttentionVehicle {
  id: string;
  registration: string;
  make: string;
  model: string;
  variant?: string | null;
  askingPrice?: number | null;
  purchasePrice?: number | null;
  investedCost?: number | null;
  daysInStock: number;
  status: string;
  reason: string;
  reasonType: 'prep' | 'ageing' | 'pricing' | 'photos' | 'transfer' | 'leads';
  actionUrl: string;
  imageUrl?: string | null;
}

export interface StockAgeBracket {
  label: string;
  range: string;
  minDays: number;
  maxDays: number | null;
  count: number;
  totalInvested: number;
  percentage: number;
}

export interface DailyPerformancePoint {
  date: string;
  label: string;
  unitsSold: number;
  grossMargin?: number;
}

export interface SalesPipelineSummary {
  leadsCount: number;
  proposalsCount: number;
  agreedCount: number;
  handoverCount: number;
  totalPipelineValue: number;
  totalProjectedGross?: number;
  activeDeals: Array<{
    id: string;
    vehicleName: string;
    customerName: string;
    stage: string;
    stageLabel: string;
    agreedPrice?: number;
    handoverTime?: string;
  }>;
}

export interface IntelligenceItem {
  id: string;
  category: 'BUYING' | 'PRICING' | 'CAPITAL';
  title: string;
  subtitle: string;
  evidence: string;
  targetFigureLabel?: string;
  targetFigureValue?: string;
  actionLabel: string;
  actionUrl: string;
  imageUrl?: string | null;
}

export interface RoleDashboardData {
  userRole: string;
  userScope: 'dealership' | 'assigned';
  canViewMargin: boolean;
  dealershipName: string;
  userFullName: string;
  summarySentence: string;
  multiSite: boolean;
  kpis: any;
  dealKpis: any;
  gauges: DashboardGauge[];
  attentionVehicles: AttentionVehicle[];
  todayFocus: Array<{
    id: string;
    type: 'appointment' | 'task' | 'handover';
    time: string;
    title: string;
    subtitle: string;
    locationName?: string;
    imageUrl?: string | null;
    linkUrl: string;
  }>;
  stockAgeDistribution: StockAgeBracket[];
  ageingCapitalExposed: number;
  salesPipeline: SalesPipelineSummary;
  performance30d: {
    points: DailyPerformancePoint[];
    totalSold: number;
    totalGross?: number;
    periodComparisonText?: string;
  };
  intelligenceFeed: IntelligenceItem[];
  stockMovements?: any;
  teamActivity: any[];
  roleSpecific: Record<string, any>;
}

export class DashboardService {
  /**
   * Aggregate role-aware Daily Control Centre data based on authenticated profile & RBAC permissions.
   */
  static async getDashboardData(userId: string): Promise<RoleDashboardData | null> {
    const supabase = await createClient();

    // 1. Fetch user profile & dealership info
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role, dealership_id, dealerships(name, city)')
      .eq('id', userId)
      .single();

    if (!profile?.dealership_id) return null;

    const dealershipId = profile.dealership_id;
    const userRole = profile.role || 'sales';
    const dealershipInfo = profile.dealerships as any;
    const dealershipName = dealershipInfo?.name || 'Hartwell Motor Group';
    const userFullName = profile.full_name || 'Peter';

    // 2. Check permission for gross margin visibility
    const canViewMargin = checkRolePermission(userRole, 'margin.read');

    // 3. Check multi-site status
    const { count: locationCount } = await supabase
      .from('dealership_locations')
      .select('id', { count: 'exact', head: true })
      .eq('dealership_id', dealershipId);

    const multiSite = (locationCount || 0) > 1;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
    const thirtyDaysAgo = subDays(now, 30).toISOString();

    // 4. Parallel data queries across canonical domains
    const [
      kpis,
      dealKpis,
      { data: vehiclesWithImages },
      { data: todayAppointments },
      { data: todayTasks },
      { data: prepDueJobs },
      { data: allLeads },
      { data: activeDealsRaw },
      { data: recentCompletedDeals },
      pricingSignals,
      buyingSignals,
      stockMovements,
      teamActivity,
    ] = await Promise.all([
      VehicleService.getStockKPIs(dealershipId),
      DealService.getKPIs(dealershipId),
      supabase
        .from('vehicles')
        .select(`
          id, make, model, variant, registration, asking_price, purchase_price, 
          prep_cost, transport_cost, status, created_at, location_id,
          vehicle_images(url, is_primary)
        `)
        .eq('dealership_id', dealershipId)
        .not('status', 'in', '("sold","completed","archived")'),
      supabase
        .from('appointments')
        .select('*, vehicles(id, registration, make, model, vehicle_images(url, is_primary)), customers(first_name, last_name)')
        .eq('dealership_id', dealershipId)
        .gte('start_at', todayStart)
        .lte('start_at', todayEnd)
        .order('start_at', { ascending: true }),
      supabase
        .from('tasks')
        .select('*')
        .eq('dealership_id', dealershipId)
        .eq('status', 'open')
        .lte('due_at', todayEnd)
        .order('due_at', { ascending: true }),
      supabase
        .from('preparation_jobs')
        .select('*, vehicles(id, registration, make, model, vehicle_images(url, is_primary))')
        .eq('dealership_id', dealershipId)
        .neq('status', 'completed')
        .neq('status', 'cancelled'),
      supabase
        .from('leads')
        .select('id, status, created_at, assigned_to, first_contact_at, vehicles(make, model, registration)')
        .eq('dealership_id', dealershipId)
        .gte('created_at', thirtyDaysAgo),
      supabase
        .from('deals')
        .select('id, status, agreed_vehicle_price, vehicle_id, customer_id, vehicles(make, model, registration), customers(first_name, last_name), created_at, projected_gross_margin')
        .eq('dealership_id', dealershipId)
        .not('status', 'in', '("completed","cancelled","lost")')
        .order('created_at', { ascending: false }),
      supabase
        .from('deals')
        .select('id, status, agreed_vehicle_price, actual_gross_margin, completed_at, created_at')
        .eq('dealership_id', dealershipId)
        .eq('status', 'completed')
        .gte('completed_at', thirtyDaysAgo)
        .order('completed_at', { ascending: true }),
      PricingService.getPricingSignals(dealershipId),
      BuyingService.getBuyingSignals(dealershipId),
      multiSite ? TransferService.getStockMovementsSummary(dealershipId) : Promise.resolve(undefined),
      ChatService.getTeamActivity(dealershipId, 5),
    ]);

    const activeVehicles = vehiclesWithImages || [];
    const totalActiveUnits = activeVehicles.length;

    // --------------------------------------------------------------------------
    // 5. Compute Operational Gauges with Deterministic Denominators
    // --------------------------------------------------------------------------
    const gauges: DashboardGauge[] = [];

    // Gauge 1: Stock Freshness (under 45 days)
    if (totalActiveUnits > 0) {
      const freshCount = activeVehicles.filter((v: any) => {
        const age = Math.floor((now.getTime() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24));
        return age <= 45;
      }).length;
      const pct = Math.round((freshCount / totalActiveUnits) * 100);
      gauges.push({
        id: 'stock_freshness',
        label: 'Stock Freshness',
        percentage: pct,
        numerator: freshCount,
        denominator: totalActiveUnits,
        denominatorContext: `${freshCount} of ${totalActiveUnits} below 45 days`,
        status: pct >= 80 ? 'good' : pct >= 60 ? 'warning' : 'critical',
      });
    }

    // Gauge 2: Lead Response SLA (responded within 2 hours or contacted)
    const leadsList = allLeads || [];
    if (leadsList.length > 0) {
      const respondedLeads = leadsList.filter((l: any) => l.status !== 'new' || !!l.first_contact_at).length;
      const pct = Math.round((respondedLeads / leadsList.length) * 100);
      gauges.push({
        id: 'lead_response',
        label: 'Lead Response SLA',
        percentage: pct,
        numerator: respondedLeads,
        denominator: leadsList.length,
        denominatorContext: `${respondedLeads} of ${leadsList.length} leads within SLA (last 30d)`,
        status: pct >= 85 ? 'good' : pct >= 70 ? 'warning' : 'critical',
      });
    }

    // Gauge 3: Advertising Readiness (retail units publish-ready with price + images)
    if (totalActiveUnits > 0) {
      const publishReady = activeVehicles.filter((v: any) => {
        const hasImages = (v.vehicle_images && v.vehicle_images.length >= 1) || false;
        const hasPrice = (v.asking_price || 0) > 0;
        return hasImages && hasPrice && v.status !== 'preparation';
      }).length;
      const pct = Math.round((publishReady / totalActiveUnits) * 100);
      gauges.push({
        id: 'ad_readiness',
        label: 'Advertising Readiness',
        percentage: pct,
        numerator: publishReady,
        denominator: totalActiveUnits,
        denominatorContext: `${publishReady} of ${totalActiveUnits} retail vehicles publish-ready`,
        status: pct >= 85 ? 'good' : pct >= 65 ? 'warning' : 'critical',
      });
    }

    // --------------------------------------------------------------------------
    // 6. Stock Ageing Distribution Buckets
    // --------------------------------------------------------------------------
    const ageBucketsDef = [
      { label: '0–30 days', range: '0-30', min: 0, max: 30 },
      { label: '31–45 days', range: '31-45', min: 31, max: 45 },
      { label: '46–60 days', range: '46-60', min: 46, max: 60 },
      { label: '61–90 days', range: '61-90', min: 61, max: 90 },
      { label: '90+ days', range: '90+', min: 91, max: null },
    ];

    let ageingCapitalExposed = 0;
    const stockAgeDistribution: StockAgeBracket[] = ageBucketsDef.map(b => {
      const inBucket = activeVehicles.filter((v: any) => {
        const age = Math.floor((now.getTime() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24));
        if (b.max === null) return age >= b.min;
        return age >= b.min && age <= b.max;
      });

      const totalInvested = inBucket.reduce((sum: number, v: any) => {
        const cost = (v.purchase_price || 0) + (v.prep_cost || 0) + (v.transport_cost || 0);
        return sum + cost;
      }, 0);

      if (b.min >= 46) {
        ageingCapitalExposed += totalInvested;
      }

      return {
        label: b.label,
        range: b.range,
        minDays: b.min,
        maxDays: b.max,
        count: inBucket.length,
        totalInvested,
        percentage: totalActiveUnits > 0 ? Math.round((inBucket.length / totalActiveUnits) * 100) : 0,
      };
    });

    // --------------------------------------------------------------------------
    // 7. Vehicles Requiring Attention (with Real Primary Images)
    // --------------------------------------------------------------------------
    const attentionMap = new Map<string, AttentionVehicle>();

    // Check pricing signals
    (pricingSignals || []).forEach((p: any) => {
      if (p.vehicle && !attentionMap.has(p.vehicle.id)) {
        const v = p.vehicle;
        const age = Math.floor((now.getTime() - new Date(v.created_at || now).getTime()) / (1000 * 60 * 60 * 24));
        attentionMap.set(v.id, {
          id: v.id,
          registration: v.registration,
          make: v.make,
          model: v.model,
          variant: v.variant,
          askingPrice: v.asking_price,
          purchasePrice: canViewMargin ? v.purchase_price : null,
          investedCost: canViewMargin ? ((v.purchase_price || 0) + (v.prep_cost || 0) + (v.transport_cost || 0)) : null,
          daysInStock: age,
          status: v.status || 'available',
          reason: p.title || 'Pricing review recommended',
          reasonType: 'pricing',
          actionUrl: `/intelligence/pricing`,
          imageUrl: v.primary_image_url || null,
        });
      }
    });

    // Check preparation jobs overdue / in prep
    (prepDueJobs || []).forEach((j: any) => {
      const v = j.vehicles;
      if (v && !attentionMap.has(v.id)) {
        attentionMap.set(v.id, {
          id: v.id,
          registration: v.registration,
          make: v.make,
          model: v.model,
          variant: null,
          askingPrice: null,
          purchasePrice: null,
          investedCost: null,
          daysInStock: 4,
          status: 'preparation',
          reason: `Prep job due: ${j.title || 'Mechanical inspection'}`,
          reasonType: 'prep',
          actionUrl: `/stock/preparation`,
          imageUrl: v.vehicle_images?.find((i: any) => i.is_primary)?.url || v.vehicle_images?.[0]?.url || null,
        });
      }
    });

    // Check stock ageing > 45 days
    activeVehicles.forEach((v: any) => {
      const age = Math.floor((now.getTime() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24));
      if (age > 45 && !attentionMap.has(v.id)) {
        const primaryImg = v.vehicle_images?.find((i: any) => i.is_primary)?.url || v.vehicle_images?.[0]?.url || null;
        attentionMap.set(v.id, {
          id: v.id,
          registration: v.registration,
          make: v.make,
          model: v.model,
          variant: v.variant,
          askingPrice: v.asking_price,
          purchasePrice: canViewMargin ? v.purchase_price : null,
          investedCost: canViewMargin ? ((v.purchase_price || 0) + (v.prep_cost || 0) + (v.transport_cost || 0)) : null,
          daysInStock: age,
          status: v.status,
          reason: `${age} days in stock · Ageing capital review`,
          reasonType: 'ageing',
          actionUrl: `/stock/${v.id}`,
          imageUrl: primaryImg,
        });
      }
    });

    const attentionVehicles = Array.from(attentionMap.values()).slice(0, 4);

    // --------------------------------------------------------------------------
    // 8. Today's Timeline Items
    // --------------------------------------------------------------------------
    const todayFocus: Array<{
      id: string;
      type: 'appointment' | 'task' | 'handover';
      time: string;
      title: string;
      subtitle: string;
      locationName?: string;
      imageUrl?: string | null;
      linkUrl: string;
    }> = [];

    (todayAppointments || []).forEach((a: any) => {
      const v = a.vehicles;
      const c = a.customers;
      const primaryImg = v?.vehicle_images?.find((i: any) => i.is_primary)?.url || v?.vehicle_images?.[0]?.url || null;
      const apptTime = new Date(a.start_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      todayFocus.push({
        id: `appt_${a.id}`,
        type: 'appointment',
        time: apptTime,
        title: a.title || 'Viewing & Test Drive',
        subtitle: `${v ? `${v.make} ${v.model} (${v.registration})` : 'Vehicle'} · ${c ? `${c.first_name} ${c.last_name}` : 'Customer'}`,
        locationName: a.location || undefined,
        imageUrl: primaryImg,
        linkUrl: `/appointments`,
      });
    });

    (todayTasks || []).slice(0, 3).forEach((t: any) => {
      todayFocus.push({
        id: `task_${t.id}`,
        type: 'task',
        time: t.due_at ? new Date(t.due_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'Today',
        title: t.title || 'Operational task',
        subtitle: t.description || 'Action required today',
        linkUrl: `/tasks`,
      });
    });

    // --------------------------------------------------------------------------
    // 9. Sales Pipeline Summary
    // --------------------------------------------------------------------------
    const rawDeals = activeDealsRaw || [];
    const proposalsCount = rawDeals.filter((d: any) => ['proposal_sent', 'quote_created'].includes(d.status)).length;
    const agreedCount = rawDeals.filter((d: any) => ['agreed', 'deposit_taken', 'finance_approved'].includes(d.status)).length;
    const handoverCount = rawDeals.filter((d: any) => ['pre_handover', 'handover_ready'].includes(d.status)).length;
    const leadsCount = leadsList.filter((l: any) => l.status === 'new' || l.status === 'contacted').length;

    const totalPipelineValue = rawDeals.reduce((sum: number, d: any) => sum + (d.agreed_vehicle_price || 0), 0);
    const totalProjectedGross = canViewMargin 
      ? rawDeals.reduce((sum: number, d: any) => sum + (d.projected_gross_margin || 0), 0)
      : undefined;

    const activeDeals = rawDeals.slice(0, 3).map((d: any) => ({
      id: d.id,
      vehicleName: d.vehicles ? `${d.vehicles.make} ${d.vehicles.model}` : 'Vehicle',
      customerName: d.customers ? `${d.customers.first_name} ${d.customers.last_name}` : 'Customer',
      stage: d.status,
      stageLabel: d.status.replace(/_/g, ' '),
      agreedPrice: d.agreed_vehicle_price,
    }));

    const salesPipeline: SalesPipelineSummary = {
      leadsCount,
      proposalsCount,
      agreedCount,
      handoverCount,
      totalPipelineValue,
      totalProjectedGross,
      activeDeals,
    };

    // --------------------------------------------------------------------------
    // 10. 30-Day Performance Points
    // --------------------------------------------------------------------------
    const completedDealsList = recentCompletedDeals || [];
    const dailyMap = new Map<string, { units: number; gross: number }>();

    for (let i = 29; i >= 0; i--) {
      const d = subDays(now, i);
      const dateKey = format(d, 'yyyy-MM-dd');
      dailyMap.set(dateKey, { units: 0, gross: 0 });
    }

    completedDealsList.forEach((d: any) => {
      if (d.completed_at) {
        const key = format(new Date(d.completed_at), 'yyyy-MM-dd');
        if (dailyMap.has(key)) {
          const curr = dailyMap.get(key)!;
          curr.units += 1;
          curr.gross += (d.actual_gross_margin || 0);
        }
      }
    });

    const performancePoints: DailyPerformancePoint[] = Array.from(dailyMap.entries()).map(([dateKey, val]) => ({
      date: dateKey,
      label: format(new Date(dateKey), 'd MMM'),
      unitsSold: val.units,
      grossMargin: canViewMargin ? val.gross : undefined,
    }));

    const totalSold30d = completedDealsList.length;
    const totalGross30d = canViewMargin
      ? completedDealsList.reduce((sum: number, d: any) => sum + (d.actual_gross_margin || 0), 0)
      : undefined;

    // --------------------------------------------------------------------------
    // 11. Intelligence Decision Feed
    // --------------------------------------------------------------------------
    const intelligenceFeed: IntelligenceItem[] = [];

    (buyingSignals || []).slice(0, 2).forEach((b: any) => {
      intelligenceFeed.push({
        id: b.id,
        category: 'BUYING',
        title: `${b.make || 'Volkswagen'} ${b.model || 'Golf R'}`,
        subtitle: b.headline || 'Stock mix opportunity identified',
        evidence: b.rationale || 'High customer search volume with zero current retail stock.',
        targetFigureLabel: 'Target buy price',
        targetFigureValue: b.target_buy_price ? `£${b.target_buy_price.toLocaleString()}` : undefined,
        actionLabel: 'Review opportunity →',
        actionUrl: `/intelligence/buying`,
      });
    });

    (pricingSignals || []).slice(0, 2).forEach((p: any) => {
      const v = p.vehicle;
      intelligenceFeed.push({
        id: p.id,
        category: 'PRICING',
        title: v ? `${v.make} ${v.model}` : 'Vehicle Pricing Attention',
        subtitle: p.title || 'Market price adjustment review',
        evidence: p.evidence_summary || 'Ageing in stock with high online views but zero recent enquiries.',
        targetFigureLabel: 'Current asking',
        targetFigureValue: v?.asking_price ? `£${v.asking_price.toLocaleString()}` : undefined,
        actionLabel: 'Review pricing →',
        actionUrl: `/intelligence/pricing`,
        imageUrl: v?.primary_image_url || null,
      });
    });

    if (ageingCapitalExposed > 0 && canViewMargin) {
      intelligenceFeed.push({
        id: 'capital_ageing_alert',
        category: 'CAPITAL',
        title: 'Ageing Capital Exposure',
        subtitle: `£${Math.round(ageingCapitalExposed / 1000)}k tied in stock > 45 days`,
        evidence: 'Capital efficiency can be improved by repricing or trade disposals.',
        actionLabel: 'View ageing inventory →',
        actionUrl: `/stock`,
      });
    }

    // --------------------------------------------------------------------------
    // 12. Dynamic Summary Sentence
    // --------------------------------------------------------------------------
    const actionsTodayCount = todayFocus.length;
    const buyingOpportunitiesCount = (buyingSignals || []).length;
    const totalInvestedK = Math.round((kpis.totalStockValue || 0) / 1000);

    const summarySentence = `${totalActiveUnits} vehicles on plot · £${totalInvestedK}k invested · ${actionsTodayCount} action${actionsTodayCount === 1 ? '' : 's'} today · ${buyingOpportunitiesCount} buying opportunit${buyingOpportunitiesCount === 1 ? 'y' : 'ies'}`;

    // --------------------------------------------------------------------------
    // 13. Role-Specific Data Scoping
    // --------------------------------------------------------------------------
    const roleSpecific: Record<string, any> = {};

    if (userRole === 'sales' || userRole === 'sales_executive') {
      const myLeads = leadsList.filter((l: any) => l.assigned_to === userId);
      roleSpecific.myLeadsCount = myLeads.length;
      roleSpecific.myTasksCount = (todayTasks || []).filter((t: any) => t.assigned_to === userId).length;
    } else if (userRole === 'buyer') {
      roleSpecific.buyingSignals = buyingSignals || [];
    }

    return {
      userRole,
      userScope: ['sales', 'sales_executive'].includes(userRole) ? 'assigned' : 'dealership',
      canViewMargin,
      dealershipName,
      userFullName,
      summarySentence,
      multiSite,
      kpis: canViewMargin ? kpis : {
        ...kpis,
        total_purchase_cost: undefined,
        total_prep_cost: undefined,
        total_invested_cost: undefined,
        total_potential_profit: undefined,
        total_margin_percentage: undefined,
      },
      dealKpis,
      gauges,
      attentionVehicles,
      todayFocus,
      stockAgeDistribution,
      ageingCapitalExposed,
      salesPipeline,
      performance30d: {
        points: performancePoints,
        totalSold: totalSold30d,
        totalGross: totalGross30d,
      },
      intelligenceFeed,
      stockMovements,
      teamActivity: teamActivity || [],
      roleSpecific,
    };
  }
}
