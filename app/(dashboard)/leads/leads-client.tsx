'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  List, 
  KanbanSquare, 
  Clock, 
  Plus, 
  User, 
  Flame, 
  AlertTriangle, 
  CheckCircle2, 
  Phone, 
  Mail, 
  Car, 
  Download,
  Filter,
  Calendar
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { LeadRecord, LeadCRM_KPIs, LeadStatus, LeadTemperature, LeadPriority } from '@/lib/services/lead-calc'
import LeadKanban from '@/components/leads/lead-kanban'
import LeadTable from '@/components/leads/lead-table'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface LeadsClientProps {
  initialLeads: LeadRecord[]
  kpis: LeadCRM_KPIs
  teamMembers: { id: string; full_name: string; email?: string; role?: string }[]
  vehicles: { id: string; make: string; model: string; registration: string; asking_price: number }[]
  currentUser: { id: string; full_name: string; role?: string }
}

const SOURCES = [
  { id: 'all', label: 'All Sources' },
  { id: 'website', label: 'Dealer Website' },
  { id: 'autotrader', label: 'AutoTrader' },
  { id: 'motors', label: 'Motors.co.uk' },
  { id: 'cargurus', label: 'CarGurus' },
  { id: 'ebay', label: 'eBay Motors' },
  { id: 'facebook', label: 'Facebook / Meta' },
  { id: 'phone', label: 'Phone Call' },
  { id: 'walk_in', label: 'Walk In' },
  { id: 'referral', label: 'Referral' },
]

export default function LeadsClient({ 
  initialLeads, 
  kpis,
  teamMembers = [],
  vehicles = [],
  currentUser
}: LeadsClientProps) {
  const router = useRouter()
  const [leads, setLeads] = useState<LeadRecord[]>(initialLeads)
  const [viewMode, setViewMode] = useState<'kanban' | 'table' | 'followup'>('kanban')
  const [search, setSearch] = useState('')
  const [selectedSource, setSelectedSource] = useState('all')
  const [selectedSalesperson, setSelectedSalesperson] = useState('all')
  const [selectedTemp, setSelectedTemp] = useState('all')
  const [selectedPriority, setSelectedPriority] = useState('all')
  const [onlyMyLeads, setOnlyMyLeads] = useState(false)
  const [isCreatingLead, setIsCreatingLead] = useState(false)

  // New Lead Modal State
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [source, setSource] = useState('website')
  const [temperature, setTemperature] = useState<LeadTemperature>('warm')
  const [priority, setPriority] = useState<LeadPriority>('normal')
  const [assignedTo, setAssignedTo] = useState(currentUser.id)
  const [message, setMessage] = useState('')
  const [isSavingLead, setIsSavingLead] = useState(false)

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // My Leads Only Filter
      if (onlyMyLeads && lead.assigned_to !== currentUser.id) {
        return false
      }

      // Salesperson Filter
      if (selectedSalesperson !== 'all') {
        if (selectedSalesperson === 'unassigned' && lead.assigned_to) return false
        if (selectedSalesperson !== 'unassigned' && lead.assigned_to !== selectedSalesperson) return false
      }

      // Source Filter
      if (selectedSource !== 'all' && lead.source?.toLowerCase() !== selectedSource.toLowerCase()) {
        return false
      }

      // Temperature Filter
      if (selectedTemp !== 'all' && lead.temperature !== selectedTemp) {
        return false
      }

      // Priority Filter
      if (selectedPriority !== 'all' && lead.priority !== selectedPriority) {
        return false
      }

      // Search Query Filter
      if (search.trim()) {
        const term = search.trim().toLowerCase()
        const name = `${lead.first_name} ${lead.last_name}`.toLowerCase()
        const emailMatch = lead.email?.toLowerCase().includes(term)
        const phoneMatch = lead.phone?.toLowerCase().includes(term)
        const vehicleMatch = lead.vehicles ? `${lead.vehicles.make} ${lead.vehicles.model} ${lead.vehicles.registration}`.toLowerCase().includes(term) : false
        if (!name.includes(term) && !emailMatch && !phoneMatch && !vehicleMatch) return false
      }

      return true
    })
  }, [leads, search, selectedSource, selectedSalesperson, selectedTemp, selectedPriority, onlyMyLeads, currentUser.id])

  // Follow-up Queue Segmentation
  const followUpQueue = useMemo(() => {
    const now = new Date()
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59)

    const active = filteredLeads.filter(l => !['won', 'lost', 'closed'].includes(l.status))

    return {
      overdue: active.filter(l => l.next_action_at && new Date(l.next_action_at) < now),
      today: active.filter(l => l.next_action_at && new Date(l.next_action_at) >= now && new Date(l.next_action_at) <= todayEnd),
      tomorrow: active.filter(l => l.next_action_at && new Date(l.next_action_at) > todayEnd && new Date(l.next_action_at) <= tomorrowEnd),
      upcoming: active.filter(l => l.next_action_at && new Date(l.next_action_at) > tomorrowEnd),
      noAction: active.filter(l => !l.next_action_at),
    }
  }, [filteredLeads])

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || (!email.trim() && !phone.trim())) {
      toast.error('First name and either email or phone are required.')
      return
    }

    setIsSavingLead(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email ? email.trim().toLowerCase() : null,
          phone: phone ? phone.trim() : null,
          vehicle_id: selectedVehicleId || null,
          source,
          temperature,
          priority,
          assigned_to: assignedTo || null,
          message: message ? message.trim() : null,
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create lead')
      }

      const created = await res.json()
      setLeads(prev => [created.lead, ...prev])
      setIsCreatingLead(false)
      setFirstName('')
      setLastName('')
      setEmail('')
      setPhone('')
      setSelectedVehicleId('')
      setMessage('')
      toast.success('Lead created and conversation initialized')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create lead')
    } finally {
      setIsSavingLead(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-void">
      
      {/* Top Header & Real KPIs */}
      <div className="bg-carbon border-b border-steel px-6 py-5 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-syne font-bold text-2xl text-cream tracking-tight">Sales Pipeline</h1>
              <Badge variant="blue" className="font-mono text-xs">
                {leads.filter(l => !['won', 'lost', 'closed'].includes(l.status)).length} ACTIVE ENQUIRIES
              </Badge>
            </div>
            <p className="font-inter text-xs text-silver mt-0.5">
              Unified customer enquiries, response SLA timers, follow-up queues, and qualification.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={() => setIsCreatingLead(!isCreatingLead)} className="gap-2">
              <Plus size={15} /> NEW ENQUIRY
            </Button>
          </div>
        </div>

        {/* Real KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 mt-5">
          <div className="bg-asphalt border border-steel p-2.5 rounded-[2px]">
            <p className="font-mono text-[9px] text-pewter uppercase tracking-wider">New Today</p>
            <p className="font-mono text-lg font-bold text-cream mt-0.5">{kpis.newToday}</p>
          </div>

          <div className="bg-asphalt border border-steel p-2.5 rounded-[2px]">
            <p className="font-mono text-[9px] text-pewter uppercase tracking-wider">Unassigned</p>
            <p className={cn("font-mono text-lg font-bold mt-0.5", kpis.unassigned > 0 ? "text-warning" : "text-cream")}>
              {kpis.unassigned}
            </p>
          </div>

          <div className="bg-asphalt border border-steel p-2.5 rounded-[2px]">
            <p className="font-mono text-[9px] text-pewter uppercase tracking-wider">Awaiting Reply</p>
            <p className={cn("font-mono text-lg font-bold mt-0.5", kpis.awaitingFirstResponse > 0 ? "text-blue font-bold" : "text-cream")}>
              {kpis.awaitingFirstResponse}
            </p>
          </div>

          <div className="bg-asphalt border border-steel p-2.5 rounded-[2px]">
            <p className="font-mono text-[9px] text-pewter uppercase tracking-wider">Overdue Tasks</p>
            <p className={cn("font-mono text-lg font-bold mt-0.5", kpis.overdueFollowUps > 0 ? "text-negative" : "text-cream")}>
              {kpis.overdueFollowUps}
            </p>
          </div>

          <div className="bg-asphalt border border-steel p-2.5 rounded-[2px]">
            <p className="font-mono text-[9px] text-pewter uppercase tracking-wider">Appts Booked</p>
            <p className="font-mono text-lg font-bold text-cream mt-0.5">{kpis.appointmentsBooked}</p>
          </div>

          <div className="bg-asphalt border border-steel p-2.5 rounded-[2px]">
            <p className="font-mono text-[9px] text-pewter uppercase tracking-wider">Hot Leads</p>
            <p className="font-mono text-lg font-bold text-positive mt-0.5">{kpis.hotLeads}</p>
          </div>

          <div className="bg-asphalt border border-steel p-2.5 rounded-[2px]">
            <p className="font-mono text-[9px] text-pewter uppercase tracking-wider">Avg 1st Reply</p>
            <p className="font-mono text-lg font-bold text-cream mt-0.5">{kpis.avgFirstResponseMinutes}m</p>
          </div>

          <div className="bg-asphalt border border-steel p-2.5 rounded-[2px]">
            <p className="font-mono text-[9px] text-pewter uppercase tracking-wider">Won Deals</p>
            <p className="font-mono text-lg font-bold text-positive mt-0.5">{kpis.won}</p>
          </div>
        </div>

        {/* View Switcher & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-5 pt-3 border-t border-steel">
          <div className="flex items-center gap-3 flex-1 min-w-[260px] max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pewter" size={14} />
              <Input 
                placeholder="Search by customer, vehicle, reg, email..." 
                className="pl-9 h-8 text-xs bg-asphalt"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* My Leads Filter Toggle */}
            <button
              onClick={() => setOnlyMyLeads(!onlyMyLeads)}
              className={cn(
                "h-8 px-3 rounded-[2px] font-mono text-xs uppercase tracking-wider border transition-colors flex items-center gap-1.5",
                onlyMyLeads ? "bg-blue/15 text-cream border-blue font-bold" : "bg-asphalt text-pewter border-steel hover:text-silver"
              )}
            >
              <User size={13} /> My Leads Only
            </button>

            {/* Salesperson Filter */}
            {teamMembers.length > 0 && (
              <select
                value={selectedSalesperson}
                onChange={(e) => setSelectedSalesperson(e.target.value)}
                className="h-8 bg-asphalt border border-steel rounded-[2px] px-2.5 font-mono text-xs text-cream"
              >
                <option value="all">All Salespeople</option>
                <option value="unassigned">Unassigned Only</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            )}

            {/* Source Filter */}
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="h-8 bg-asphalt border border-steel rounded-[2px] px-2.5 font-mono text-xs text-cream"
            >
              {SOURCES.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>

            {/* Temperature Filter */}
            <select
              value={selectedTemp}
              onChange={(e) => setSelectedTemp(e.target.value)}
              className="h-8 bg-asphalt border border-steel rounded-[2px] px-2.5 font-mono text-xs text-cream"
            >
              <option value="all">All Temperatures</option>
              <option value="hot">🔥 Hot</option>
              <option value="warm">⚡ Warm</option>
              <option value="cold">❄️ Cold</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-asphalt border border-steel rounded-[2px] p-0.5">
              <button 
                onClick={() => setViewMode('kanban')}
                className={cn(
                  "p-1.5 rounded-[2px] transition-colors flex items-center gap-1 text-xs font-mono px-2",
                  viewMode === 'kanban' ? "bg-steel text-cream" : "text-pewter hover:text-silver"
                )}
                title="Kanban Pipeline"
              >
                <KanbanSquare size={14} /> Pipeline
              </button>
              <button 
                onClick={() => setViewMode('table')}
                className={cn(
                  "p-1.5 rounded-[2px] transition-colors flex items-center gap-1 text-xs font-mono px-2",
                  viewMode === 'table' ? "bg-steel text-cream" : "text-pewter hover:text-silver"
                )}
                title="Table View"
              >
                <List size={14} /> Table
              </button>
              <button 
                onClick={() => setViewMode('followup')}
                className={cn(
                  "p-1.5 rounded-[2px] transition-colors flex items-center gap-1 text-xs font-mono px-2",
                  viewMode === 'followup' ? "bg-steel text-cream" : "text-pewter hover:text-silver"
                )}
                title="Follow-up Queue"
              >
                <Clock size={14} /> Follow-ups
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Workspace */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        
        {/* Create Lead Modal */}
        {isCreatingLead && (
          <div className="p-6 max-w-4xl mx-auto overflow-y-auto max-h-full">
            <form onSubmit={handleCreateLead} className="bg-carbon border border-steel p-6 rounded-[2px] space-y-4 animate-in fade-in duration-200">
              <h2 className="font-syne font-bold text-lg text-cream">Create New Customer Lead</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">First Name *</label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Sarah" required />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Last Name</label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="e.g. Jenkins" />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Email</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. sarah.j@example.co.uk" />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Phone</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 07700 900456" />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Vehicle of Interest</label>
                  <select 
                    value={selectedVehicleId} 
                    onChange={(e) => setSelectedVehicleId(e.target.value)} 
                    className="w-full h-10 bg-asphalt border border-steel rounded-[2px] px-3 font-mono text-xs text-cream"
                  >
                    <option value="">No specific vehicle (General enquiry)</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.registration} — {v.make} {v.model} (£{v.asking_price?.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Enquiry Source</label>
                  <select 
                    value={source} 
                    onChange={(e) => setSource(e.target.value)} 
                    className="w-full h-10 bg-asphalt border border-steel rounded-[2px] px-3 font-mono text-xs text-cream"
                  >
                    {SOURCES.filter(s => s.id !== 'all').map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Lead Temperature</label>
                  <select 
                    value={temperature} 
                    onChange={(e) => setTemperature(e.target.value as LeadTemperature)} 
                    className="w-full h-10 bg-asphalt border border-steel rounded-[2px] px-3 font-mono text-xs text-cream"
                  >
                    <option value="hot">🔥 Hot (Immediate intent)</option>
                    <option value="warm">⚡ Warm (Active search)</option>
                    <option value="cold">❄️ Cold (Browsing)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Assigned Salesperson</label>
                  <select 
                    value={assignedTo} 
                    onChange={(e) => setAssignedTo(e.target.value)} 
                    className="w-full h-10 bg-asphalt border border-steel rounded-[2px] px-3 font-mono text-xs text-cream"
                  >
                    <option value="">Leave Unassigned</option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.full_name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Customer Message / Enquiry Notes</label>
                  <textarea 
                    rows={3} 
                    value={message} 
                    onChange={(e) => setMessage(e.target.value)} 
                    placeholder="Customer enquiry content..." 
                    className="w-full bg-asphalt border border-steel p-3 rounded-[2px] text-xs text-cream resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-steel">
                <Button type="button" variant="ghost" onClick={() => setIsCreatingLead(false)}>Cancel</Button>
                <Button type="submit" disabled={isSavingLead}>CREATE LEAD</Button>
              </div>
            </form>
          </div>
        )}

        {/* View 1: Kanban Pipeline */}
        {!isCreatingLead && viewMode === 'kanban' && (
          <LeadKanban leads={filteredLeads} setLeads={setLeads} />
        )}

        {/* View 2: Table View */}
        {!isCreatingLead && viewMode === 'table' && (
          <div className="h-full overflow-y-auto px-6 py-6">
            <LeadTable leads={filteredLeads} />
          </div>
        )}

        {/* View 3: Follow-up Queue */}
        {!isCreatingLead && viewMode === 'followup' && (
          <div className="h-full overflow-y-auto p-6 space-y-6 max-w-6xl mx-auto">
            
            {/* Overdue Queue */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-negative" />
                <h2 className="font-syne font-bold text-base text-cream">Overdue Follow-ups</h2>
                <Badge variant="negative" className="font-mono text-[10px]">{followUpQueue.overdue.length}</Badge>
              </div>
              <div className="space-y-2">
                {followUpQueue.overdue.length > 0 ? followUpQueue.overdue.map(lead => (
                  <Link key={lead.id} href={`/leads/${lead.id}`} className="p-4 bg-carbon border border-negative/40 hover:border-negative rounded-[2px] flex items-center justify-between transition-colors block">
                    <div>
                      <p className="font-inter font-medium text-sm text-cream">{lead.first_name} {lead.last_name}</p>
                      <p className="font-mono text-xs text-silver mt-0.5">{lead.vehicles ? `${lead.vehicles.make} ${lead.vehicles.model} (${lead.vehicles.registration})` : 'General enquiry'}</p>
                    </div>
                    <div className="text-right font-mono text-xs text-negative">
                      <span>Due: {lead.next_action_at ? format(new Date(lead.next_action_at), 'dd MMM HH:mm') : 'Overdue'}</span>
                    </div>
                  </Link>
                )) : (
                  <p className="font-inter text-xs text-pewter p-4 bg-carbon border border-steel rounded-[2px]">No overdue follow-ups.</p>
                )}
              </div>
            </div>

            {/* Due Today Queue */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className="text-warning" />
                <h2 className="font-syne font-bold text-base text-cream">Due Today</h2>
                <Badge variant="warning" className="font-mono text-[10px]">{followUpQueue.today.length}</Badge>
              </div>
              <div className="space-y-2">
                {followUpQueue.today.length > 0 ? followUpQueue.today.map(lead => (
                  <Link key={lead.id} href={`/leads/${lead.id}`} className="p-4 bg-carbon border border-steel hover:border-slate rounded-[2px] flex items-center justify-between transition-colors block">
                    <div>
                      <p className="font-inter font-medium text-sm text-cream">{lead.first_name} {lead.last_name}</p>
                      <p className="font-mono text-xs text-silver mt-0.5">{lead.vehicles ? `${lead.vehicles.make} ${lead.vehicles.model}` : 'General enquiry'}</p>
                    </div>
                    <div className="text-right font-mono text-xs text-warning">
                      <span>{lead.next_action_at ? format(new Date(lead.next_action_at), 'HH:mm') : 'Today'}</span>
                    </div>
                  </Link>
                )) : (
                  <p className="font-inter text-xs text-pewter p-4 bg-carbon border border-steel rounded-[2px]">No actions scheduled for today.</p>
                )}
              </div>
            </div>

            {/* Upcoming Queue */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={16} className="text-blue" />
                <h2 className="font-syne font-bold text-base text-cream">Upcoming Follow-ups</h2>
                <Badge variant="outline" className="font-mono text-[10px]">{followUpQueue.upcoming.length + followUpQueue.tomorrow.length}</Badge>
              </div>
              <div className="space-y-2">
                {[...followUpQueue.tomorrow, ...followUpQueue.upcoming].length > 0 ? [...followUpQueue.tomorrow, ...followUpQueue.upcoming].map(lead => (
                  <Link key={lead.id} href={`/leads/${lead.id}`} className="p-4 bg-carbon border border-steel hover:border-slate rounded-[2px] flex items-center justify-between transition-colors block">
                    <div>
                      <p className="font-inter font-medium text-sm text-cream">{lead.first_name} {lead.last_name}</p>
                      <p className="font-mono text-xs text-silver mt-0.5">{lead.vehicles ? `${lead.vehicles.make} ${lead.vehicles.model}` : 'General enquiry'}</p>
                    </div>
                    <div className="text-right font-mono text-xs text-silver">
                      <span>{lead.next_action_at ? format(new Date(lead.next_action_at), 'dd MMM yyyy') : 'Upcoming'}</span>
                    </div>
                  </Link>
                )) : (
                  <p className="font-inter text-xs text-pewter p-4 bg-carbon border border-steel rounded-[2px]">No upcoming follow-ups scheduled.</p>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
