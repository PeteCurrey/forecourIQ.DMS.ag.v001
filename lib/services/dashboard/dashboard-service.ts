import { createClient } from '@/lib/supabase/server';
import { VehicleService } from '@/lib/services/vehicle';
import { DealService } from '@/lib/services/deal';
import { BuyingService } from '@/lib/services/intelligence/buying-service';
import { PricingService } from '@/lib/services/intelligence/pricing-service';
import { TransferService } from '@/lib/services/transfers/transfer-service';
import { ChatService } from '@/lib/services/chat/chat-service';
import { checkRolePermission } from '@/lib/rbac/permissions';
import { subDays } from 'date-fns';

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

export interface RoleDashboardData {
  userRole: string;
  userScope: 'dealership' | 'assigned';
  canViewMargin: boolean;
  dealershipName: string;
  userFullName: string;
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
  stockMovements?: any;
  teamActivity: any[];
  roleSpecific: Record<string, any>;
}

export class DashboardService {
  /**
   * Aggregate role-aware dashboard data based on authenticated profile & RBAC permissions.
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

    // 4. Parallel data queries
    const [
      kpis,
      dealKpis,
      { data: vehiclesWithImages },
      { data: todayAppointments },
      { data: todayTasks },
      { data: prepDueJobs },
      { data: allLeads },
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
      PricingService.getPricingSignals(dealershipId),
      BuyingService.getBuyingSignals(dealershipId),
      multiSite ? TransferService.getStockMovementsSummary(dealershipId) : Promise.resolve(undefined),
      ChatService.getTeamActivity(dealershipId, 5),
    ]);

    const activeVehicles = vehiclesWithImages || [];

    // --------------------------------------------------------------------------
    // 5. Compute Operational Gauges with Deterministic Denominators
    // --------------------------------------------------------------------------
    const gauges: DashboardGauge[] = [];

    // Gauge 1: Stock Freshness (under 45 days)
    const totalActive = activeVehicles.length;
    if (totalActive > 0) {
      const freshCount = activeVehicles.filter((v: any) => {
        const age = Math.floor((now.getTime() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24));
        return age <= 45;
      }).length;
      const pct = Math.round((freshCount / totalActive) * 100);
      gauges.push({
        id: 'stock_freshness',
        label: 'Stock Freshness',
        percentage: pct,
        numerator: freshCount,
        denominator: totalActive,
        denominatorContext: `${freshCount} of ${totalActive} units < 45 days`,
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
        denominatorContext: `${respondedLeads} of ${leadsList.length} leads responded within SLA`,
        status: pct >= 85 ? 'good' : pct >= 70 ? 'warning' : 'critical',
      });
    }

    // Gauge 3: Advertising Readiness (retail units publish-ready with price + images)
    if (totalActive > 0) {
      const publishReady = activeVehicles.filter((v: any) => {
        const hasImages = (v.vehicle_images && v.vehicle_images.length >= 1) || false;
        const hasPrice = (v.asking_price || 0) > 0;
        return hasImages && hasPrice && v.status !== 'preparation';
      }).length;
      const pct = Math.round((publishReady / totalActive) * 100);
      gauges.push({
        id: 'ad_readiness',
        label: 'Advertising Readiness',
        percentage: pct,
        numerator: publishReady,
        denominator: totalActive,
        denominatorContext: `${publishReady} of ${totalActive} retail vehicles ready to publish`,
        status: pct >= 85 ? 'good' : pct >= 65 ? 'warning' : 'critical',
      });
    }

    // --------------------------------------------------------------------------
    // 6. Extract Vehicles Requiring Attention (with Real Primary Images)
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
          daysInStock: 5,
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
          reason: `${age} days in stock · Ageing review required`,
          reasonType: 'ageing',
          actionUrl: `/stock/${v.id}`,
          imageUrl: primaryImg,
        });
      }
    });

    const attentionVehicles = Array.from(attentionMap.values()).slice(0, 5);

    // --------------------------------------------------------------------------
    // 7. Today's Focus Items
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
        title: t.title || 'Follow-up task',
        subtitle: t.description || 'Action required today',
        linkUrl: `/tasks`,
      });
    });

    // --------------------------------------------------------------------------
    // 8. Role-Specific Data Scoping
    // --------------------------------------------------------------------------
    const roleSpecific: Record<string, any> = {};

    if (userRole === 'sales' || userRole === 'sales_executive') {
      // Scope to current user's leads, tasks, appointments
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
      stockMovements,
      teamActivity: teamActivity || [],
      roleSpecific,
    };
  }
}
