'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, User, Mail, Phone, MapPin, ShieldCheck, Inbox, Calendar, CheckSquare, FileText, Plus, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CustomerRecord } from '@/lib/services/customer'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/format'

const TABS = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'leads', label: 'Enquiries & Leads', icon: Inbox },
  { id: 'appointments', label: 'Appointments', icon: Calendar },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'deals', label: 'Deals & Purchases', icon: FileText },
  { id: 'consent', label: 'GDPR Consent History', icon: ShieldCheck },
]

export default function CustomerHub({ customer: initialCustomer }: { customer: CustomerRecord }) {
  const [customer, setCustomer] = useState<CustomerRecord>(initialCustomer)
  const [activeTab, setActiveTab] = useState('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Edit fields
  const [firstName, setFirstName] = useState(customer.first_name)
  const [lastName, setLastName] = useState(customer.last_name)
  const [email, setEmail] = useState(customer.email || '')
  const [phone, setPhone] = useState(customer.phone || '')
  const [address1, setAddress1] = useState(customer.address_line1 || '')
  const [city, setCity] = useState(customer.city || '')
  const [postcode, setPostcode] = useState(customer.postcode || '')
  const [notes, setNotes] = useState(customer.notes || '')

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/customers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.id,
          first_name: firstName,
          last_name: lastName,
          email: email || null,
          phone: phone || null,
          address_line1: address1 || null,
          city: city || null,
          postcode: postcode || null,
          notes: notes || null,
        })
      })
      if (!res.ok) throw new Error('Failed to update')
      setCustomer(prev => ({
        ...prev,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        address_line1: address1,
        city,
        postcode,
        notes
      }))
      setIsEditing(false)
      toast.success('Customer details updated')
    } catch {
      toast.error('Failed to update customer')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-void overflow-y-auto min-h-screen">
      
      {/* Top Header */}
      <div className="bg-carbon border-b border-steel px-6 py-6 sticky top-0 z-30 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm" className="gap-2 text-pewter hover:text-cream">
              <Link href="/customers">
                <ArrowLeft size={16} /> CUSTOMERS
              </Link>
            </Button>

            <div className="h-6 w-px bg-steel hidden sm:block" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-asphalt border border-steel flex items-center justify-center text-blue font-mono font-bold text-sm">
                {customer.first_name.charAt(0)}{customer.last_name.charAt(0)}
              </div>
              <div>
                <h1 className="font-syne font-bold text-xl text-cream">
                  {customer.first_name} {customer.last_name}
                </h1>
                <p className="font-mono text-xs text-silver">
                  Created {format(new Date(customer.created_at), 'dd MMM yyyy')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {customer.marketing_consent ? (
              <Badge variant="positive" className="gap-1 font-mono text-[10px]">
                <ShieldCheck size={12} /> MARKETING OPTED-IN
              </Badge>
            ) : (
              <Badge variant="outline" className="font-mono text-[10px]">
                NO MARKETING CONSENT
              </Badge>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto border-b border-steel mt-6 pt-1">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "font-mono text-[11px] uppercase tracking-wider pb-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors",
                  activeTab === tab.id
                    ? "text-cream border-blue font-bold"
                    : "text-pewter border-transparent hover:text-silver"
                )}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Tab View */}
      <div className="p-6 max-w-6xl mx-auto w-full flex-1">
        
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
            
            {/* Contact Details */}
            <div className="bg-carbon border border-steel p-6 rounded-[2px] space-y-4 md:col-span-2">
              <div className="flex justify-between items-center">
                <h2 className="font-syne font-bold text-lg text-cream">Contact Information</h2>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                  {isEditing ? 'CANCEL' : 'EDIT DETAILS'}
                </Button>
              </div>

              {isEditing ? (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-mono text-[10px] text-pewter uppercase">First Name</label>
                      <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="font-mono text-[10px] text-pewter uppercase">Last Name</label>
                      <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-mono text-[10px] text-pewter uppercase">Email</label>
                      <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="font-mono text-[10px] text-pewter uppercase">Telephone</label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] text-pewter uppercase">Address</label>
                    <Input value={address1} onChange={(e) => setAddress1(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-mono text-[10px] text-pewter uppercase">City</label>
                      <Input value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="font-mono text-[10px] text-pewter uppercase">Postcode</label>
                      <Input value={postcode} onChange={(e) => setPostcode(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] text-pewter uppercase">Notes</label>
                    <textarea 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)} 
                      rows={3} 
                      className="w-full bg-asphalt border border-steel p-3 rounded-[2px] text-sm text-cream"
                    />
                  </div>
                  <Button onClick={handleSaveProfile} disabled={isSaving} className="gap-2">
                    <Save size={14} /> SAVE CHANGES
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-inter text-xs pt-2">
                  <div className="border-b border-steel/60 pb-3">
                    <p className="font-mono text-[10px] text-pewter uppercase tracking-wider mb-1">Email Address</p>
                    <p className="text-cream font-medium">{customer.email || '—'}</p>
                  </div>
                  <div className="border-b border-steel/60 pb-3">
                    <p className="font-mono text-[10px] text-pewter uppercase tracking-wider mb-1">Phone Number</p>
                    <p className="text-cream font-medium">{customer.phone || '—'}</p>
                  </div>
                  <div className="border-b border-steel/60 pb-3">
                    <p className="font-mono text-[10px] text-pewter uppercase tracking-wider mb-1">Address</p>
                    <p className="text-cream font-medium">{customer.address_line1 || '—'}</p>
                  </div>
                  <div className="border-b border-steel/60 pb-3">
                    <p className="font-mono text-[10px] text-pewter uppercase tracking-wider mb-1">City / Postcode</p>
                    <p className="text-cream font-medium">{customer.city || ''} {customer.postcode || '—'}</p>
                  </div>
                  {customer.notes && (
                    <div className="sm:col-span-2 pt-2">
                      <p className="font-mono text-[10px] text-pewter uppercase tracking-wider mb-1">Relationship Notes</p>
                      <p className="text-silver leading-relaxed">{customer.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Relationship Stats */}
            <div className="bg-carbon border border-steel p-6 rounded-[2px] space-y-4">
              <h2 className="font-syne font-bold text-lg text-cream">Activity Summary</h2>
              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between text-silver">
                  <span>Enquiries / Leads:</span>
                  <span className="text-cream font-bold">{customer.leads?.length || 0}</span>
                </div>
                <div className="flex justify-between text-silver">
                  <span>Appointments:</span>
                  <span className="text-cream font-bold">{customer.appointments?.length || 0}</span>
                </div>
                <div className="flex justify-between text-silver">
                  <span>Deals Completed:</span>
                  <span className="text-cream font-bold">{customer.deals?.length || 0}</span>
                </div>
                <div className="flex justify-between text-silver">
                  <span>Pending Tasks:</span>
                  <span className="text-cream font-bold">{customer.tasks?.length || 0}</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* LEADS */}
        {activeTab === 'leads' && (
          <div className="bg-carbon border border-steel rounded-[2px] overflow-hidden animate-in fade-in duration-200">
            <div className="p-6 border-b border-steel">
              <h2 className="font-syne font-bold text-lg text-cream">Enquiries & Leads</h2>
            </div>
            {customer.leads && customer.leads.length > 0 ? (
              <div className="divide-y divide-steel">
                {customer.leads.map(lead => (
                  <Link key={lead.id} href={`/leads/${lead.id}`} className="p-4 flex items-center justify-between hover:bg-asphalt transition-colors block">
                    <div>
                      <p className="font-mono text-xs text-silver">Lead ID: {lead.id.substring(0, 8)}</p>
                      <p className="font-mono text-[10px] text-pewter mt-0.5">{format(new Date(lead.created_at), 'dd MMM yyyy')}</p>
                    </div>
                    <Badge variant="outline">{lead.status}</Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="p-12 text-center text-pewter font-inter text-sm">No linked enquiries for this customer.</p>
            )}
          </div>
        )}

        {/* APPOINTMENTS */}
        {activeTab === 'appointments' && (
          <div className="bg-carbon border border-steel p-6 rounded-[2px] animate-in fade-in duration-200">
            <h2 className="font-syne font-bold text-lg text-cream mb-4">Appointments & Viewings</h2>
            {customer.appointments && customer.appointments.length > 0 ? (
              <div className="space-y-3">
                {customer.appointments.map(a => (
                  <div key={a.id} className="p-3 bg-asphalt border border-steel rounded-[2px] flex justify-between items-center">
                    <div>
                      <p className="font-inter text-sm font-medium text-cream">{a.title}</p>
                      <p className="font-mono text-[11px] text-pewter">{format(new Date(a.start_at), 'dd MMM yyyy HH:mm')}</p>
                    </div>
                    <Badge variant="outline">{a.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-pewter font-inter text-sm">No appointments scheduled.</p>
            )}
          </div>
        )}

        {/* TASKS */}
        {activeTab === 'tasks' && (
          <div className="bg-carbon border border-steel p-6 rounded-[2px] animate-in fade-in duration-200">
            <h2 className="font-syne font-bold text-lg text-cream mb-4">Customer Follow-up Tasks</h2>
            {customer.tasks && customer.tasks.length > 0 ? (
              <div className="space-y-2">
                {customer.tasks.map(t => (
                  <div key={t.id} className="p-3 bg-asphalt border border-steel rounded-[2px] flex justify-between items-center">
                    <p className="font-inter text-sm text-cream">{t.title}</p>
                    <Badge variant="outline">{t.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-pewter font-inter text-sm">No open tasks for this customer.</p>
            )}
          </div>
        )}

        {/* DEALS */}
        {activeTab === 'deals' && (
          <div className="bg-carbon border border-steel p-6 rounded-[2px] animate-in fade-in duration-200">
            <h2 className="font-syne font-bold text-lg text-cream mb-4">Deals & Vehicle Transactions</h2>
            {customer.deals && customer.deals.length > 0 ? (
              <div className="space-y-3">
                {customer.deals.map(d => (
                  <div key={d.id} className="p-4 bg-asphalt border border-steel rounded-[2px] flex justify-between items-center">
                    <div>
                      <p className="font-mono text-sm font-bold text-cream">DEAL #{d.deal_number}</p>
                      <p className="font-inter text-xs text-silver">Status: {d.status}</p>
                    </div>
                    <p className="font-mono text-base font-bold text-positive">{formatCurrency(d.sale_price)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-pewter font-inter text-sm">No transaction records logged.</p>
            )}
          </div>
        )}

        {/* CONSENT */}
        {activeTab === 'consent' && (
          <div className="bg-carbon border border-steel p-6 rounded-[2px] space-y-4 animate-in fade-in duration-200">
            <h2 className="font-syne font-bold text-lg text-cream">GDPR & Marketing Consent History</h2>
            <div className="p-4 bg-asphalt border border-steel rounded-[2px]">
              <p className="font-inter text-sm text-cream font-medium mb-1">
                Current Marketing Status: {customer.marketing_consent ? 'Opted In' : 'No Consent'}
              </p>
              <p className="font-mono text-xs text-silver">
                {customer.marketing_consent_at 
                  ? `Consent granted on ${format(new Date(customer.marketing_consent_at), 'dd MMM yyyy HH:mm')}`
                  : 'No formal consent recorded.'}
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
