'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Wrench, CheckCircle2, Clock, AlertTriangle, Plus, Filter, Car, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { formatCurrency, formatRegistration } from '@/lib/format'
import { PrepJobRecord } from '@/lib/services/preparation'
import { format, differenceInDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface PreparationClientProps {
  initialJobs: PrepJobRecord[]
}

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'mechanical', label: 'Mechanical' },
  { id: 'service', label: 'Service & MOT' },
  { id: 'alloy_wheel', label: 'Alloy Wheels' },
  { id: 'bodywork', label: 'Bodywork' },
  { id: 'valeting', label: 'Valeting & Detail' },
  { id: 'photography', label: 'Photography' },
]

export default function PreparationClient({ initialJobs }: PreparationClientProps) {
  const router = useRouter()
  const [jobs, setJobs] = useState<PrepJobRecord[]>(initialJobs)
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filteredJobs = jobs.filter(j => {
    if (statusFilter !== 'all' && j.status !== statusFilter) return false
    if (categoryFilter !== 'all' && j.category !== categoryFilter) return false
    if (search) {
      const term = search.toLowerCase()
      const titleMatch = j.title.toLowerCase().includes(term)
      const regMatch = j.vehicles?.registration?.toLowerCase().includes(term)
      const makeMatch = j.vehicles?.make?.toLowerCase().includes(term)
      const modelMatch = j.vehicles?.model?.toLowerCase().includes(term)
      if (!titleMatch && !regMatch && !makeMatch && !modelMatch) return false
    }
    return true
  })

  // Metrics
  const activeJobs = jobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled')
  const totalEstimatedSpend = activeJobs.reduce((acc, j) => acc + Number(j.estimated_cost || 0), 0)
  const totalActualSpend = jobs.reduce((acc, j) => acc + Number(j.actual_cost || 0), 0)
  const overdueJobs = activeJobs.filter(j => j.due_date && differenceInDays(new Date(j.due_date), new Date()) < 0)

  const handleCompleteJob = async (jobId: string, estimatedCost: number) => {
    try {
      const res = await fetch('/api/prep-jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          status: 'completed',
          actual_cost: estimatedCost,
        })
      })
      if (!res.ok) throw new Error('Failed to complete')
      const updated = await res.json()
      setJobs(prev => prev.map(j => j.id === jobId ? updated : j))
      toast.success('Preparation task marked complete')
      router.refresh()
    } catch {
      toast.error('Failed to update task')
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-void overflow-y-auto min-h-screen">
      
      {/* Header */}
      <div className="bg-carbon border-b border-steel px-6 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-syne font-bold text-[28px] text-cream tracking-tight">Preparation Board</h1>
              <Badge variant="blue" className="font-mono text-[11px]">
                {activeJobs.length} ACTIVE JOBS
              </Badge>
            </div>
            <p className="font-inter text-sm text-silver mt-1">
              Operational workshop, bodyshop, MOT, and valeting pipeline for daily morning review.
            </p>
          </div>
        </div>

        {/* Prep KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="bg-asphalt border border-steel p-4 rounded-[2px]">
            <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Active Prep Tasks</p>
            <p className="font-mono text-2xl font-bold text-cream mt-1">{activeJobs.length}</p>
            <p className="font-mono text-[10px] text-silver mt-0.5">Across stock inventory</p>
          </div>

          <div className="bg-asphalt border border-steel p-4 rounded-[2px]">
            <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Overdue Tasks</p>
            <p className={cn(
              "font-mono text-2xl font-bold mt-1",
              overdueJobs.length > 0 ? "text-negative" : "text-cream"
            )}>
              {overdueJobs.length}
            </p>
            <p className="font-mono text-[10px] text-silver mt-0.5">Requiring immediate action</p>
          </div>

          <div className="bg-asphalt border border-steel p-4 rounded-[2px]">
            <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Estimated Pipeline Spend</p>
            <p className="font-mono text-2xl font-bold text-cream mt-1">{formatCurrency(totalEstimatedSpend)}</p>
            <p className="font-mono text-[10px] text-silver mt-0.5">Pending completion</p>
          </div>

          <div className="bg-asphalt border border-steel p-4 rounded-[2px]">
            <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Completed Spend</p>
            <p className="font-mono text-2xl font-bold text-positive mt-1">{formatCurrency(totalActualSpend)}</p>
            <p className="font-mono text-[10px] text-silver mt-0.5">Synced to vehicle ledgers</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-steel">
          <div className="flex items-center gap-3 flex-1 min-w-[260px] max-w-md">
            <Input
              placeholder="Search by job title, vehicle reg, make, model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-xs bg-asphalt"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 bg-asphalt border border-steel rounded-[2px] px-3 font-mono text-xs text-cream focus:border-blue"
            >
              <option value="all">All Statuses</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting">Waiting for Parts</option>
              <option value="completed">Completed</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 bg-asphalt border border-steel rounded-[2px] px-3 font-mono text-xs text-cream focus:border-blue"
            >
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Main Board View */}
      <div className="p-6">
        {filteredJobs.length === 0 ? (
          <div className="border border-steel bg-carbon p-12 text-center rounded-[2px] max-w-xl mx-auto my-12">
            <Wrench size={40} className="mx-auto text-pewter mb-3" />
            <h3 className="font-syne font-bold text-lg text-cream mb-1">No preparation jobs</h3>
            <p className="font-inter text-sm text-silver">
              All vehicles are either fully prepared or no jobs have been scheduled.
            </p>
          </div>
        ) : (
          <div className="bg-carbon border border-steel rounded-[2px] overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-asphalt border-b border-steel font-mono text-[10px] text-pewter uppercase tracking-wider">
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4">Task Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Supplier / Bay</th>
                  <th className="py-3 px-4 text-right">Est. Cost</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map(job => {
                  const isOverdue = job.due_date && differenceInDays(new Date(job.due_date), new Date()) < 0 && job.status !== 'completed'

                  return (
                    <tr key={job.id} className="border-b border-steel/60 hover:bg-asphalt/50 transition-colors">
                      <td className="py-3.5 px-4">
                        {job.vehicles ? (
                          <Link href={`/stock/${job.vehicle_id}`} className="flex items-center gap-2 group">
                            <span className="font-mono text-xs font-bold text-cream bg-void border border-steel px-2 py-0.5 rounded-[2px] group-hover:border-blue transition-colors">
                              {formatRegistration(job.vehicles.registration)}
                            </span>
                            <span className="font-inter text-xs text-silver group-hover:text-cream truncate max-w-[150px]">
                              {job.vehicles.make} {job.vehicles.model}
                            </span>
                          </Link>
                        ) : (
                          <span className="font-mono text-xs text-pewter">Vehicle</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-inter text-sm font-medium text-cream">{job.title}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-silver capitalize">{job.category.replace(/_/g, ' ')}</td>
                      <td className="py-3.5 px-4 font-inter text-xs text-silver">{job.supplier || '—'}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-right text-silver">{formatCurrency(job.estimated_cost)}</td>
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <span className={isOverdue ? "text-negative font-bold flex items-center gap-1" : "text-silver"}>
                          {isOverdue && <AlertTriangle size={12} />}
                          {job.due_date ? format(new Date(job.due_date), 'dd MMM yyyy') : '—'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={job.status === 'completed' ? 'positive' : isOverdue ? 'negative' : 'default'} className="uppercase text-[10px]">
                          {job.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {job.status !== 'completed' ? (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleCompleteJob(job.id, job.actual_cost || job.estimated_cost || 0)} 
                            className="text-[11px] h-7 gap-1"
                          >
                            <CheckCircle2 size={12} /> COMPLETE
                          </Button>
                        ) : (
                          <span className="font-mono text-[10px] text-positive font-bold">DONE</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
