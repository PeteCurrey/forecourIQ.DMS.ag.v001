import { createClient } from '@/lib/supabase/server';
import { CustomerGDPRExport } from '@/lib/types/platform';

export class GDPRService {
  /**
   * Export all customer personal data across domain modules.
   */
  static async exportCustomerData(dealershipId: string, customerId: string): Promise<CustomerGDPRExport> {
    const supabase = await createClient();

    const [
      { data: customer, error: custErr },
      { data: dealership },
      { data: enquiries },
      { data: deals },
      { data: conversations },
      { data: appointments },
    ] = await Promise.all([
      supabase.from('customers').select('*').eq('id', customerId).eq('dealership_id', dealershipId).single(),
      supabase.from('dealerships').select('name').eq('id', dealershipId).single(),
      supabase.from('leads').select('id, source, status, created_at, vehicles(make, model)').eq('customer_id', customerId),
      supabase.from('deals').select('id, deal_number, status, agreed_price, created_at, vehicles(make, model)').eq('customer_id', customerId),
      supabase.from('conversations').select('id, channel, last_message_at').eq('customer_id', customerId),
      supabase.from('appointments').select('title, start_at, location').eq('customer_id', customerId),
    ]);

    if (custErr || !customer) {
      throw new Error('Customer record not found for data export.');
    }

    return {
      exportDate: new Date().toISOString(),
      dealershipName: dealership?.name || 'Dealership',
      customerProfile: {
        id: customer.id,
        firstName: customer.first_name,
        lastName: customer.last_name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address_line1,
        postcode: customer.postcode,
        marketingConsent: customer.marketing_consent || false,
        createdAt: customer.created_at,
      },
      enquiryHistory: (enquiries || []).map((e: any) => ({
        id: e.id,
        source: e.source,
        vehicleOfInterest: e.vehicles ? `${e.vehicles.make} ${e.vehicles.model}` : undefined,
        status: e.status,
        createdAt: e.created_at,
      })),
      dealHistory: (deals || []).map((d: any) => ({
        id: d.id,
        dealNumber: d.deal_number || 'DMS-DEAL',
        vehicle: d.vehicles ? `${d.vehicles.make} ${d.vehicles.model}` : 'Vehicle',
        status: d.status,
        agreedPrice: d.agreed_price || 0,
        createdAt: d.created_at,
      })),
      conversations: (conversations || []).map(c => ({
        channel: c.channel,
        messageCount: 1,
        lastContactAt: c.last_message_at || '',
      })),
      appointments: (appointments || []).map(a => ({
        title: a.title,
        startAt: a.start_at,
        location: a.location,
      })),
    };
  }

  /**
   * Perform compliant customer erasure (anonymizes personal identifiers while preserving financial ledger/tax requirements).
   */
  static async anonymizeCustomer(dealershipId: string, customerId: string): Promise<{ success: boolean }> {
    const supabase = await createClient();

    // Check if customer has active deals
    const { data: activeDeals } = await supabase
      .from('deals')
      .select('id')
      .eq('customer_id', customerId)
      .not('status', 'in', '("completed","cancelled")');

    if (activeDeals && activeDeals.length > 0) {
      throw new Error('Cannot delete or anonymize customer with active unfinalized commercial deals.');
    }

    // Anonymize personal details in customer record
    const { error: updateErr } = await supabase
      .from('customers')
      .update({
        first_name: 'Anonymised',
        last_name: 'Customer',
        email: `anonymised_${customerId.slice(0, 8)}@deleted.forecouriq.local`,
        phone: null,
        address_line1: null,
        address_line2: null,
        postcode: null,
        marketing_consent: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', customerId)
      .eq('dealership_id', dealershipId);

    if (updateErr) {
      throw new Error(`Failed to anonymize customer record: ${updateErr.message}`);
    }

    return { success: true };
  }
}
