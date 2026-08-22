'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Users, Plus, Search, Mail, Phone, MapPin, ChevronRight, UserCheck, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CustomerRecord } from '@/lib/services/customer'
import { format } from 'date-fns'
import { toast } from 'sonner'

export default function CustomersClient({ initialCustomers }: { initialCustomers: CustomerRecord[] }) {
  const router = useRouter()
  const [customers, setCustomers] = useState<CustomerRecord[]>(initialCustomers)
  const [search, setSearch] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  
  // New Customer Form
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const filteredCustomers = customers.filter(c => {
    if (search.trim()) {
      const term = search.trim().toLowerCase()
      const name = `${c.first_name} ${c.last_name}`.toLowerCase()
      const emailMatch = c.email?.toLowerCase().includes(term)
      const phoneMatch = c.phone?.toLowerCase().includes(term)
      if (!name.includes(term) && !emailMatch && !phoneMatch) return false
    }
    return true
  })

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName || !lastName) {
      toast.error('First and last name are required')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email: email ? email.trim().toLowerCase() : null,
          phone: phone ? phone.trim() : null,
          marketing_consent: marketingConsent,
        })
      })

      if (!res.ok) throw new Error('Failed to create customer')
      const created = await res.json()
      setCustomers(prev => [created, ...prev])
      setIsCreating(false)
      setFirstName('')
      setLastName('')
      setEmail('')
      setPhone('')
      setMarketingConsent(false)
      toast.success('Customer created')
      router.refresh()
    } catch {
      toast.error('Failed to create customer record')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-void overflow-y-auto min-h-screen">
      
      {/* Header */}
      <div className="bg-carbon border-b border-steel px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-syne font-bold text-[28px] text-cream tracking-tight">Customers</h1>
              <Badge variant="outline" className="font-mono text-xs">
                {customers.length} RECORDS
              </Badge>
            </div>
            <p className="font-inter text-sm text-silver mt-1">
              Durable client identities, relationship history, GDPR consent tracking, and deal linkage.
            </p>
          </div>

          <Button onClick={() => setIsCreating(!isCreating)} className="gap-2">
            <Plus size={15} /> NEW CUSTOMER
          </Button>
        </div>

        {/* Search */}
        <div className="mt-6 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pewter" size={15} />
            <Input
              placeholder="Search by name, email, or telephone number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs bg-asphalt"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto w-full">
        
        {/* Create Customer Drawer/Modal */}
        {isCreating && (
          <form onSubmit={handleCreateCustomer} className="bg-carbon border border-steel p-6 rounded-[2px] mb-8 space-y-4 animate-in fade-in duration-200">
            <h2 className="font-syne font-bold text-lg text-cream">Create New Customer Record</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">First Name *</label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. David" required />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Last Name *</label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="e.g. Miller" required />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Email Address</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. david.miller@example.co.uk" />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Telephone / Mobile</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 07700 900123" />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <input 
                type="checkbox" 
                id="consent" 
                checked={marketingConsent} 
                onChange={(e) => setMarketingConsent(e.target.checked)} 
                className="rounded-[2px] bg-void border-steel"
              />
              <label htmlFor="consent" className="font-inter text-xs text-silver cursor-pointer">
                Customer granted marketing and communications consent (GDPR logged)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-steel">
              <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>CREATE CUSTOMER</Button>
            </div>
          </form>
        )}

        {/* Customer List */}
        {filteredCustomers.length === 0 ? (
          <div className="border border-steel bg-carbon p-12 text-center rounded-[2px] max-w-xl mx-auto my-8">
            <Users size={36} className="mx-auto text-pewter mb-3" />
            <h3 className="font-syne font-bold text-lg text-cream mb-1">No customers found</h3>
            <p className="font-inter text-sm text-silver mb-6">
              Customers will automatically be linked as incoming leads and enquiries arrive.
            </p>
            <Button onClick={() => setIsCreating(true)} className="gap-2">
              <Plus size={14} /> ADD FIRST CUSTOMER
            </Button>
          </div>
        ) : (
          <div className="bg-carbon border border-steel rounded-[2px] overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-asphalt border-b border-steel font-mono text-[10px] text-pewter uppercase tracking-wider">
                  <th className="py-3.5 px-4">Customer Name</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Enquiries / Leads</th>
                  <th className="py-3.5 px-4">Deals / Purchases</th>
                  <th className="py-3.5 px-4">Consent Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(customer => (
                  <tr 
                    key={customer.id} 
                    onClick={() => router.push(`/customers/${customer.id}`)}
                    className="border-b border-steel/60 hover:bg-asphalt/50 cursor-pointer transition-colors group"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-asphalt border border-steel flex items-center justify-center text-blue font-mono text-xs">
                          {customer.first_name.charAt(0)}{customer.last_name.charAt(0)}
                        </div>
                        <p className="font-inter font-medium text-sm text-cream group-hover:text-blue transition-colors">
                          {customer.first_name} {customer.last_name}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-inter text-xs text-silver">
                      <div className="space-y-0.5">
                        {customer.email && <p className="flex items-center gap-1.5"><Mail size={12} className="text-pewter" /> {customer.email}</p>}
                        {customer.phone && <p className="flex items-center gap-1.5"><Phone size={12} className="text-pewter" /> {customer.phone}</p>}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-silver">
                      {customer.leads?.length || 0} enquiries
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-silver">
                      {customer.deals?.length || 0} deals
                    </td>
                    <td className="py-4 px-4">
                      {customer.marketing_consent ? (
                        <span className="font-mono text-[10px] text-positive flex items-center gap-1">
                          <ShieldCheck size={13} /> CONSENT GRANTED
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-pewter">
                          NO CONSENT
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-silver">
                      {format(new Date(customer.created_at), 'dd MMM yyyy')}
                    </td>
                    <td className="py-4 px-4 text-right text-pewter group-hover:text-cream">
                      <ChevronRight size={15} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
