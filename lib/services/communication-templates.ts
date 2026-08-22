/**
 * Pure template interpolation and template definitions for communications.
 * Safe to import in both Client and Server components.
 */

export interface TemplateVariables {
  customer_first_name?: string
  customer_last_name?: string
  vehicle_make?: string
  vehicle_model?: string
  registration?: string
  dealership_name?: string
  salesperson_name?: string
}

/**
 * Safely interpolate variables into a message template.
 */
export function interpolateTemplate(template: string, vars: TemplateVariables): string {
  let result = template
  const replacements: Record<string, string> = {
    '{{customer_first_name}}': vars.customer_first_name || 'Customer',
    '{{customer_last_name}}': vars.customer_last_name || '',
    '{{vehicle_make}}': vars.vehicle_make || 'Vehicle',
    '{{vehicle_model}}': vars.vehicle_model || '',
    '{{registration}}': vars.registration || '',
    '{{dealership_name}}': vars.dealership_name || 'Our Dealership',
    '{{salesperson_name}}': vars.salesperson_name || 'The Sales Team',
  }

  for (const [key, value] of Object.entries(replacements)) {
    result = result.replaceAll(key, value.trim())
  }

  return result
}

/**
 * Standard pre-built response templates for dealerships.
 */
export function getStandardTemplates(vars: TemplateVariables) {
  return [
    {
      id: 'vehicle_available',
      title: 'Vehicle Available & Ready for Viewing',
      subject: `Regarding your enquiry on the ${vars.vehicle_make || ''} ${vars.vehicle_model || ''}`,
      body: interpolateTemplate(
        `Hi {{customer_first_name}},\n\nThank you for your enquiry regarding our {{vehicle_make}} {{vehicle_model}} ({{registration}}).\n\nI can confirm this vehicle is currently in stock, fully prepared, and available for viewing and test drive at {{dealership_name}}.\n\nWould you like to arrange a convenient time to view the vehicle this week?\n\nBest regards,\n{{salesperson_name}}\n{{dealership_name}}`,
        vars
      ),
    },
    {
      id: 'request_part_ex',
      title: 'Request Part Exchange Details',
      subject: `Part Exchange Valuation — ${vars.dealership_name || 'ForecourIQ'}`,
      body: interpolateTemplate(
        `Hi {{customer_first_name}},\n\nThanks for reaching out about the {{vehicle_make}} {{vehicle_model}}.\n\nTo ensure we give you the most accurate valuation on your current vehicle, could you please confirm:\n1. Your vehicle registration and current mileage\n2. Service history status\n3. Any notable options or condition details\n\nLooking forward to assisting you.\n\nBest regards,\n{{salesperson_name}}`,
        vars
      ),
    },
    {
      id: 'confirm_appointment',
      title: 'Appointment Confirmation',
      subject: `Confirmed: Appointment at ${vars.dealership_name || 'Our Dealership'}`,
      body: interpolateTemplate(
        `Hi {{customer_first_name}},\n\nThis is to confirm your upcoming appointment at {{dealership_name}} regarding the {{vehicle_make}} {{vehicle_model}} ({{registration}}).\n\nThe vehicle will be prepared and ready for your arrival.\n\nIf you need directions or have any questions beforehand, please don't hesitate to reply directly to this message.\n\nBest regards,\n{{salesperson_name}}`,
        vars
      ),
    },
    {
      id: 'follow_up',
      title: 'General Follow-up',
      subject: `Follow-up regarding the ${vars.vehicle_make || 'vehicle'} at ${vars.dealership_name || ''}`,
      body: interpolateTemplate(
        `Hi {{customer_first_name}},\n\nI wanted to follow up on your recent enquiry regarding the {{vehicle_make}} {{vehicle_model}}.\n\nPlease let me know if you would like any further information, a personalised video walkthrough, or to schedule a viewing.\n\nBest regards,\n{{salesperson_name}}`,
        vars
      ),
    },
  ]
}
