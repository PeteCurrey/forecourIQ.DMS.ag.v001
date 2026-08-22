import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LeadService } from '../lead'
import { CommunicationService } from '../communication'

test('CRM SLA Calculation: accurately measures response times and overdue thresholds', () => {
  const now = new Date()
  
  // Case 1: Responded in 25 minutes
  const receivedAt = new Date(now.getTime() - 30 * 60 * 1000).toISOString()
  const firstResponseAt = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
  const respondedSLA = LeadService.calculateSLA({
    created_at: receivedAt,
    received_at: receivedAt,
    first_response_at: firstResponseAt,
  })

  assert.equal(respondedSLA.status, 'responded')
  assert.equal(respondedSLA.minutesTaken, 25)
  assert.equal(respondedSLA.isWithinSLA, true)

  // Case 2: Unanswered and Overdue (>60 min target)
  const oldReceivedAt = new Date(now.getTime() - 95 * 60 * 1000).toISOString()
  const overdueSLA = LeadService.calculateSLA({
    created_at: oldReceivedAt,
    received_at: oldReceivedAt,
    first_response_at: null,
  })

  assert.equal(overdueSLA.status, 'overdue')
  assert.equal(overdueSLA.isWithinSLA, false)
  assert.match(overdueSLA.label, /Overdue by 35m/)

  // Case 3: Unanswered and On Time (15 min elapsed)
  const freshReceivedAt = new Date(now.getTime() - 15 * 60 * 1000).toISOString()
  const freshSLA = LeadService.calculateSLA({
    created_at: freshReceivedAt,
    received_at: freshReceivedAt,
    first_response_at: null,
  })

  assert.equal(freshSLA.status, 'on_time')
  assert.equal(freshSLA.isWithinSLA, true)
  assert.match(freshSLA.label, /45m remaining/)
})

test('Communication Templates: correctly interpolates customer and vehicle variables', () => {
  const template = 'Hi {{customer_first_name}}, thank you for enquiring about the {{vehicle_make}} {{vehicle_model}} ({{registration}}) at {{dealership_name}}.'
  const interpolated = CommunicationService.interpolateTemplate(template, {
    customer_first_name: 'James',
    vehicle_make: 'BMW',
    vehicle_model: 'M340i',
    registration: 'KP71OWU',
    dealership_name: 'Hartwell Motor Group',
  })

  assert.equal(
    interpolated,
    'Hi James, thank you for enquiring about the BMW M340i (KP71OWU) at Hartwell Motor Group.'
  )
})

test('Communication Providers: truthfully reports UNCONFIGURED for unkeyed external gateways', () => {
  const providers = CommunicationService.getProvidersStatus()
  
  assert.ok(Array.isArray(providers))
  assert.equal(providers.length, 4)

  const webProvider = providers.find(p => p.channel === 'web')
  assert.ok(webProvider)
  assert.equal(webProvider.status, 'ACTIVE')

  const smsProvider = providers.find(p => p.channel === 'sms')
  assert.ok(smsProvider)
  if (!process.env.TWILIO_ACCOUNT_SID) {
    assert.equal(smsProvider.status, 'UNCONFIGURED')
  }
})
