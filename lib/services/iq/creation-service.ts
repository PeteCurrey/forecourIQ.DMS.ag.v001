import { createClient } from '@/lib/supabase/server';
import { IQProvider } from './provider';

export interface DraftReplyRequest {
  dealershipId: string;
  userId?: string;
  leadId: string;
  tone?: 'professional' | 'concise' | 'friendly';
}

export interface VehicleDescriptionRequest {
  dealershipId: string;
  userId?: string;
  vehicleId: string;
  keyFeatures?: string[];
}

export const CreationService = {
  /**
   * Drafts an intelligent response to a customer enquiry.
   */
  async draftCustomerReply(req: DraftReplyRequest): Promise<{ draft: string; model_used: string }> {
    const supabase = await createClient();

    const { data: lead } = await supabase
      .from('leads')
      .select('first_name, last_name, source, notes, vehicles(make, model, variant, year, asking_price)')
      .eq('id', req.leadId)
      .eq('dealership_id', req.dealershipId)
      .single();

    if (!lead) throw new Error('Lead not found');

    const veh = Array.isArray(lead.vehicles) ? lead.vehicles[0] : lead.vehicles;
    const vehName = veh ? `${veh.year || ''} ${veh.make} ${veh.model} ${veh.variant || ''}` : 'the vehicle you enquired about';

    const systemPrompt = `You are a sales specialist at a premium UK independent motor dealership.
Draft a polite, professional reply to customer ${lead.first_name} regarding ${vehName}.
Ask if they would like to arrange an appointment or test drive. Keep it concise, friendly, and under 120 words.`;

    const aiRes = await IQProvider.complete({
      dealershipId: req.dealershipId,
      userId: req.userId,
      capability: 'generation',
      systemPrompt,
      userPrompt: `Customer Name: ${lead.first_name} ${lead.last_name}\nVehicle: ${vehName}\nEnquiry Notes: ${lead.notes || 'General online enquiry'}`,
      untrustedInputs: [{ name: 'customer_notes', content: lead.notes || '' }],
      maxTokens: 250,
    });

    const fallbackDraft = `Dear ${lead.first_name},\n\nThank you for getting in touch with us regarding the ${vehName}. The vehicle is currently available in our showroom and ready for viewing.\n\nWould you be available to arrange a viewing or test drive with us this week?\n\nKind regards,\nSales Team`;

    return {
      draft: aiRes.content || fallbackDraft,
      model_used: aiRes.modelName,
    };
  },

  /**
   * Drafts a compelling vehicle marketing description for advertising portals.
   */
  async draftVehicleDescription(req: VehicleDescriptionRequest): Promise<{ description: string; model_used: string }> {
    const supabase = await createClient();

    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('make, model, variant, year, mileage, fuel_type, transmission, colour, asking_price, specification')
      .eq('id', req.vehicleId)
      .eq('dealership_id', req.dealershipId)
      .single();

    if (!vehicle) throw new Error('Vehicle not found');

    const systemPrompt = `You are an expert automotive merchandiser.
Write an engaging, truthful vehicle advertisement description for a ${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.variant || ''}.
Highlight specification, condition, mileage (${vehicle.mileage?.toLocaleString()} miles), and provenance. Avoid generic clichés.`;

    const aiRes = await IQProvider.complete({
      dealershipId: req.dealershipId,
      userId: req.userId,
      capability: 'generation',
      systemPrompt,
      userPrompt: `Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.variant}\nMileage: ${vehicle.mileage}\nColour: ${vehicle.colour}\nTransmission: ${vehicle.transmission}\nFuel: ${vehicle.fuel_type}\nFeatures: ${(req.keyFeatures || []).join(', ')}`,
      maxTokens: 400,
    });

    const fallbackDescription = `ForecourIQ is pleased to present this superb ${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.variant || ''} finished in ${vehicle.colour || 'metallic'}. Having covered just ${vehicle.mileage?.toLocaleString() || 'low'} miles with ${vehicle.transmission || 'automatic'} transmission. Presented in exceptional condition throughout with full inspection completed. Contact our team to arrange a viewing or test drive.`;

    return {
      description: aiRes.content || fallbackDescription,
      model_used: aiRes.modelName,
    };
  }
};
