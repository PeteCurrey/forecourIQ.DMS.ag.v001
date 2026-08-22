'use client'

import { useState } from 'react'
import { Calendar as CalendarIcon, Plus, Clock, User, Car, MapPin, CheckCircle2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AppointmentRecord, AppointmentType } from '@/lib/services/appointment'
import { format, isToday, isFuture } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface AppointmentsClientProps {
  initialAppointments: AppointmentRecord[]
}

const APPOINTMENT_TYPES = [
  { id: 'test_drive', label: 'Test Drive' },
  { id: 'sales_appointment', label: 'Sales Appointment' },
  { id: 'vehicle_viewing', label: 'Vehicle Viewing' },
  { id: 'collection', label: 'Vehicle Collection' },
  { id: 'handover', label: 'Customer Handover' },
  { id: 'call', label: 'Phone Consultation' },
  { id: 'other', label: 'Other Appointment' },
]

export default function AppointmentsClient({ initialAppointments }: AppointmentsClientProps) {
  const router = useRouter()
  const [appointments, setAppointments] = useState<AppointmentRecord[]>(initialAppointments)
  const [isCreating, setIsCreating] = useState(false)
  const [viewFilter, setViewFilter] = useState<'today' | 'upcoming' | 'all'>('today')

  // Form State
  const [title, setTitle] = useState('')
  const [type, setType] = useState<AppointmentType>('test_drive')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [location, setLocation] = useState('Main Forecourt')
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const filteredAppointments = appointments.filter(a => {
    const d = new Date(a.start_at)
    if (viewFilter === 'today') return isToday(d)
    if (viewFilter === 'upcoming') return isFuture(d)
    return true
  })

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !startAt || !endAt) {
      toast.error('Title, start time, and end time are required')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          appointment_type: type,
          start_at: new Date(startAt).toISOString(),
          end_at: new Date(endAt).toISOString(),
          location,
          notes: notes || null,
        })
      })

      if (!res.ok) throw new Error('Failed to create appointment')
      const created = await res.json()
      setAppointments(prev => [created, ...prev])
      setIsCreating(false)
      setTitle('')
      setStartAt('')
      setEndAt('')
      toast.success('Appointment booked')
      router.refresh()
    } catch {
      toast.error('Failed to book appointment')
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
              <h1 className="font-syne font-bold text-[28px] text-cream tracking-tight">Appointments & Agenda</h1>
              <Badge variant="outline" className="font-mono text-xs">
                {appointments.length} SCHEDULED
              </Badge>
            </div>
            <p className="font-inter text-sm text-silver mt-1">
              Dealership operational calendar, test drives, collections, and vehicle handovers.
            </p>
          </div>

          <Button onClick={() => setIsCreating(!isCreating)} className="gap-2">
            <Plus size={15} /> BOOK APPOINTMENT
          </Button>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 mt-6 pt-4 border-t border-steel">
          <button
            onClick={() => setViewFilter('today')}
            className={cn(
              "font-mono text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-[2px] border transition-colors",
              viewFilter === 'today' ? "bg-steel text-cream border-blue font-bold" : "text-pewter border-transparent hover:text-silver"
            )}
          >
            Today's Agenda
          </button>
          <button
            onClick={() => setViewFilter('upcoming')}
            className={cn(
              "font-mono text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-[2px] border transition-colors",
              viewFilter === 'upcoming' ? "bg-steel text-cream border-blue font-bold" : "text-pewter border-transparent hover:text-silver"
            )}
          >
            Upcoming Schedule
          </button>
          <button
            onClick={() => setViewFilter('all')}
            className={cn(
              "font-mono text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-[2px] border transition-colors",
              viewFilter === 'all' ? "bg-steel text-cream border-blue font-bold" : "text-pewter border-transparent hover:text-silver"
            )}
          >
            All Appointments
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-5xl mx-auto w-full">
        
        {/* Booking Form */}
        {isCreating && (
          <form onSubmit={handleCreateAppointment} className="bg-carbon border border-steel p-6 rounded-[2px] mb-8 space-y-4 animate-in fade-in duration-200">
            <h2 className="font-syne font-bold text-lg text-cream">Schedule New Appointment</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Appointment Title *</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Test Drive — BMW 330e (James Wilson)" required />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Type</label>
                <select value={type} onChange={(e) => setType(e.target.value as AppointmentType)} className="w-full h-10 bg-asphalt border border-steel rounded-[2px] px-3 font-mono text-sm text-cream">
                  {APPOINTMENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Location / Bay</label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Main Forecourt, Customer Lounge" />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Start Time *</label>
                <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">End Time *</label>
                <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-steel">
              <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>CONFIRM BOOKING</Button>
            </div>
          </form>
        )}

        {/* Appointments List */}
        {filteredAppointments.length === 0 ? (
          <div className="border border-steel bg-carbon p-12 text-center rounded-[2px]">
            <CalendarIcon size={36} className="mx-auto text-pewter mb-3" />
            <h3 className="font-syne font-bold text-lg text-cream mb-1">No appointments scheduled</h3>
            <p className="font-inter text-sm text-silver mb-6">
              {viewFilter === 'today' ? 'No appointments on the agenda for today.' : 'No upcoming viewings scheduled.'}
            </p>
            <Button onClick={() => setIsCreating(true)}>BOOK APPOINTMENT</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAppointments.map(appt => (
              <div key={appt.id} className="bg-carbon border border-steel hover:border-slate p-4 rounded-[2px] flex items-center justify-between gap-4 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-asphalt border border-steel rounded-[2px] flex flex-col items-center justify-center font-mono">
                    <span className="text-[10px] text-pewter uppercase">{format(new Date(appt.start_at), 'MMM')}</span>
                    <span className="text-base font-bold text-cream leading-none">{format(new Date(appt.start_at), 'dd')}</span>
                  </div>
                  <div>
                    <h3 className="font-inter font-medium text-sm text-cream">{appt.title}</h3>
                    <div className="flex items-center gap-4 mt-1 font-mono text-[11px] text-silver">
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="text-pewter" />
                        {format(new Date(appt.start_at), 'HH:mm')} – {format(new Date(appt.end_at), 'HH:mm')}
                      </span>
                      {appt.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-pewter" />
                          {appt.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Badge variant={appt.status === 'confirmed' ? 'positive' : 'outline'} className="uppercase font-mono text-[10px]">
                  {appt.status}
                </Badge>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
