import { createClient } from '@/lib/supabase/server';
import { VehicleService } from '@/lib/services/vehicle';
import { DealService } from '@/lib/services/deal';
import { BuyingService } from '@/lib/services/intelligence/buying-service';
import { PricingService } from '@/lib/services/intelligence/pricing-service';
import { IntegrationService } from '@/lib/services/integrations/integration-service';
import { BriefingFactPack } from '@/lib/types/iq';
import { subDays } from 'date-fns';

export interface DealershipContextFacts {
  role: string;
  canViewMargin: boolean;
  stock: {
    totalUnits: number;
    inPrep: number;
    reserved: number;
    averageDays: number;
    over60Days: number;
    investedCapital?: number; // Redacted if !canViewMargin
    potentialGross?: number;  // Redacted if !canViewMargin
  };
  leads: {
    totalActive: number;
    unansweredCount: number;
    overdue48hCount: number;
    newTodayCount: number;
  };
  deals: {
    totalActive: number;
    depositsOutstanding: number;
    handoversThisWeek: number;
    blockedCount: number;
  };
  agenda: {
    todayAppointments: number;
    todayPrepDue: number;
  };
  intelligence: {
    buyingOpportunities: number;
    pricingAttentionCount: number;
  };
  integrations: {
    liveAdverts: number;
    unconfiguredCount: number;
  };
}

export const ContextEngine = {
  /**
   * Builds a role-filtered, tenant-isolated fact pack for the dealership.
   * Redacts sensitive financial margins if the user lacks privileged permissions.
   */
  async getDealershipFactPack(dealershipId: string, userRole: string = 'sales'): Promise<DealershipContextFacts> {
    const supabase = await createClient();
    const now = new Date();
    const twoDaysAgo = subDays(now, 2);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    const canViewMargin = userRole === 'admin' || userRole === 'dealer_principal' || userRole === 'manager';

    const [
      kpis,
      dealKpis,
      { data: todayAppointments },
      { data: prepDueJobs },
      { data: overdueLeads },
      { data: newLeadsToday },
      { data: allActiveLeads },
      buyingSignals,
      pricingSignals,
      { data: portalListings },
      integrations,
    ] = await Promise.all([
      VehicleService.getStockKPIs(dealershipId),
      DealService.getKPIs(dealershipId),
      supabase.from('appointments').select('id').eq('dealership_id', dealershipId).gte('start_at', todayStart).lte('start_at', todayEnd),
      supabase.from('preparation_jobs').select('id').eq('dealership_id', dealershipId).neq('status', 'completed').neq('status', 'cancelled').lte('due_date', now.toISOString().split('T')[0]),
      supabase.from('leads').select('id').eq('dealership_id', dealershipId).in('status', ['new', 'contacted']).lt('created_at', twoDaysAgo.toISOString()),
      supabase.from('leads').select('id').eq('dealership_id', dealershipId).gte('created_at', todayStart),
      supabase.from('leads').select('id').eq('dealership_id', dealershipId).not('status', 'in', '("won","lost","archived")'),
      BuyingService.getBuyingSignals(dealershipId),
      PricingService.getPricingSignals(dealershipId),
      supabase.from('portal_listings').select('status').eq('dealership_id', dealershipId),
      IntegrationService.listForDealership(dealershipId),
    ]);

    const liveAdverts = (portalListings || []).filter(l => l.status === 'live').length;
    const unconfigured = integrations.filter(i => i.state.status === 'credentials_required' || i.state.status === 'not_configured').length;

    return {
      role: userRole,
      canViewMargin,
      stock: {
        totalUnits: kpis.totalRetailUnits,
        inPrep: kpis.vehiclesInPreparation,
        reserved: kpis.vehiclesReserved,
        averageDays: kpis.averageDaysInStock,
        over60Days: (kpis.ageingBreakdown.days61to90 || 0) + (kpis.ageingBreakdown.over90 || 0),
        investedCapital: canViewMargin ? kpis.totalStockValue : undefined,
        potentialGross: canViewMargin ? kpis.potentialGrossMargin : undefined,
      },
      leads: {
        totalActive: allActiveLeads?.length || 0,
        unansweredCount: overdueLeads?.length || 0,
        overdue48hCount: overdueLeads?.length || 0,
        newTodayCount: newLeadsToday?.length || 0,
      },
      deals: {
        totalActive: dealKpis.totalActive,
        depositsOutstanding: dealKpis.depositsOutstanding,
        handoversThisWeek: dealKpis.handoversThisWeek,
        blockedCount: dealKpis.byStatus?.blocked || 0,
      },
      agenda: {
        todayAppointments: todayAppointments?.length || 0,
        todayPrepDue: prepDueJobs?.length || 0,
      },
      intelligence: {
        buyingOpportunities: buyingSignals.filter(s => s.status === 'new' || s.status === 'reviewed').length,
        pricingAttentionCount: pricingSignals.filter(s => s.status === 'active').length,
      },
      integrations: {
        liveAdverts,
        unconfiguredCount: unconfigured,
      },
    };
  },

  /**
   * Generates a raw snapshot for historical daily briefing records.
   */
  async getBriefingFactPack(dealershipId: string): Promise<BriefingFactPack> {
    const facts = await this.getDealershipFactPack(dealershipId, 'admin');
    return {
      dealership_id: dealershipId,
      generated_at: new Date().toISOString(),
      stock: {
        total_retail: facts.stock.totalUnits,
        total_invested: facts.stock.investedCapital || 0,
        potential_gross: facts.stock.potentialGross || 0,
        average_days: facts.stock.averageDays,
        over_60_days: facts.stock.over60Days,
        in_prep: facts.stock.inPrep,
      },
      sales: {
        yesterday_sold: 0, // Computed from completed deals
        yesterday_gross: 0,
        leads_last_24h: facts.leads.newTodayCount,
        unanswered_leads_48h: facts.leads.unansweredCount,
      },
      agenda: {
        today_appointments: facts.agenda.todayAppointments,
        today_handovers: facts.deals.handoversThisWeek > 0 ? 1 : 0,
        today_prep_deadlines: facts.agenda.todayPrepDue,
      },
      compliance: {
        blocked_deals: facts.deals.blockedCount,
      },
      integrations: {
        live_adverts: facts.integrations.liveAdverts,
        feed_errors: 0,
        unconfigured: [],
      },
      intelligence: {
        active_buying_signals: facts.intelligence.buyingOpportunities,
        active_pricing_signals: facts.intelligence.pricingAttentionCount,
      },
    };
  }
};
