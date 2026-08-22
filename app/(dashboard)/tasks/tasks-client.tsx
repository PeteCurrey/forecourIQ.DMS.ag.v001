'use client'

import { useState } from 'react'
import { CheckSquare, Plus, Clock, AlertTriangle, CheckCircle2, User, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { TaskRecord, TaskPriority } from '@/lib/services/task'
import { format, differenceInDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface TasksClientProps {
  initialTasks: TaskRecord[]
}

const STATUS_FILTERS = [
  { id: 'all', label: 'All Tasks' },
  { id: 'active', label: 'Open & In Progress' },
  { id: 'completed', label: 'Completed' },
]

export default function TasksClient({ initialTasks }: TasksClientProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState<TaskRecord[]>(initialTasks)
  const [statusFilter, setStatusFilter] = useState('active')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [isCreating, setIsCreating] = useState(false)
  
  // New task state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [dueAt, setDueAt] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const filteredTasks = tasks.filter(t => {
    if (statusFilter === 'active' && (t.status === 'completed' || t.status === 'cancelled')) return false
    if (statusFilter === 'completed' && t.status !== 'completed') return false
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
    return true
  })

  const overdueCount = tasks.filter(t => t.status === 'open' && t.due_at && differenceInDays(new Date(t.due_at), new Date()) < 0).length
  const todayCount = tasks.filter(t => t.status === 'open' && t.due_at && differenceInDays(new Date(t.due_at), new Date()) === 0).length

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsSaving(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description ? description.trim() : null,
          priority,
          due_at: dueAt ? new Date(dueAt).toISOString() : null,
        })
      })
      if (!res.ok) throw new Error('Failed to create')
      const created = await res.json()
      setTasks(prev => [created, ...prev])
      setIsCreating(false)
      setTitle('')
      setDescription('')
      setDueAt('')
      toast.success('Task created')
      router.refresh()
    } catch {
      toast.error('Failed to create task')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleComplete = async (task: TaskRecord) => {
    const nextStatus = task.status === 'completed' ? 'open' : 'completed'
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, status: nextStatus })
      })
      if (!res.ok) throw new Error('Failed to update')
      const updated = await res.json()
      setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
      toast.success(nextStatus === 'completed' ? 'Task marked completed' : 'Task reopened')
      router.refresh()
    } catch {
      toast.error('Failed to update task')
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-void overflow-y-auto min-h-screen">
      
      {/* Header */}
      <div className="bg-carbon border-b border-steel px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-syne font-bold text-[28px] text-cream tracking-tight">Dealership Tasks</h1>
              <Badge variant="outline" className="font-mono text-xs">
                {tasks.filter(t => t.status !== 'completed').length} PENDING
              </Badge>
            </div>
            <p className="font-inter text-sm text-silver mt-1">
              Operational follow-ups, appraisal actions, customer callbacks, and daily dealership tasks.
            </p>
          </div>

          <Button onClick={() => setIsCreating(!isCreating)} className="gap-2">
            <Plus size={15} /> NEW TASK
          </Button>
        </div>

        {/* Quick Task Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="bg-asphalt border border-steel p-3.5 rounded-[2px]">
            <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Overdue Tasks</p>
            <p className={cn("font-mono text-xl font-bold mt-1", overdueCount > 0 ? "text-negative" : "text-cream")}>
              {overdueCount}
            </p>
          </div>
          <div className="bg-asphalt border border-steel p-3.5 rounded-[2px]">
            <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Due Today</p>
            <p className="font-mono text-xl font-bold text-warning mt-1">{todayCount}</p>
          </div>
          <div className="bg-asphalt border border-steel p-3.5 rounded-[2px]">
            <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Open Tasks</p>
            <p className="font-mono text-xl font-bold text-cream mt-1">{tasks.filter(t => t.status === 'open').length}</p>
          </div>
          <div className="bg-asphalt border border-steel p-3.5 rounded-[2px]">
            <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Completed</p>
            <p className="font-mono text-xl font-bold text-positive mt-1">{tasks.filter(t => t.status === 'completed').length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-steel">
          <div className="flex gap-2">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={cn(
                  "font-mono text-xs uppercase tracking-wider px-3 py-1.5 rounded-[2px] transition-colors border",
                  statusFilter === f.id ? "bg-steel text-cream border-blue" : "text-pewter border-transparent hover:text-silver"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8 bg-asphalt border border-steel rounded-[2px] px-3 font-mono text-xs text-cream"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-5xl mx-auto w-full">
        
        {/* Create Task Drawer */}
        {isCreating && (
          <form onSubmit={handleCreateTask} className="bg-carbon border border-steel p-6 rounded-[2px] mb-8 space-y-4 animate-in fade-in duration-200">
            <h2 className="font-syne font-bold text-lg text-cream">Create Operational Task</h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Task Title *</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Call James Wilson re: BMW 330e finance options" required />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Description</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  rows={3} 
                  className="w-full bg-asphalt border border-steel p-3 rounded-[2px] text-sm text-cream resize-none"
                  placeholder="Additional context or customer requirements..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Priority</label>
                  <select 
                    value={priority} 
                    onChange={(e) => setPriority(e.target.value as TaskPriority)} 
                    className="w-full h-10 bg-asphalt border border-steel rounded-[2px] px-3 text-sm text-cream font-mono"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[10px] text-pewter uppercase tracking-wider">Due Date & Time</label>
                  <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-steel">
              <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>CREATE TASK</Button>
            </div>
          </form>
        )}

        {/* Task List */}
        {filteredTasks.length === 0 ? (
          <div className="border border-steel bg-carbon p-12 text-center rounded-[2px]">
            <CheckSquare size={36} className="mx-auto text-pewter mb-3" />
            <h3 className="font-syne font-bold text-lg text-cream mb-1">You're clear</h3>
            <p className="font-inter text-sm text-silver mb-6">No tasks matching current filter criteria.</p>
            <Button onClick={() => setIsCreating(true)}>ADD TASK</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map(task => {
              const isOverdue = task.status !== 'completed' && task.due_at && differenceInDays(new Date(task.due_at), new Date()) < 0

              return (
                <div 
                  key={task.id} 
                  className={cn(
                    "bg-carbon border rounded-[2px] p-4 flex items-start justify-between gap-4 transition-colors",
                    task.status === 'completed' ? "border-steel opacity-60" :
                    isOverdue ? "border-negative/40 bg-negative/5" : "border-steel hover:border-slate"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <button 
                      onClick={() => handleToggleComplete(task)}
                      className={cn(
                        "mt-0.5 w-5 h-5 rounded-[2px] border flex items-center justify-center transition-colors",
                        task.status === 'completed' ? "bg-positive border-positive text-void" : "border-steel hover:border-blue bg-void"
                      )}
                    >
                      {task.status === 'completed' && <CheckCircle2 size={14} />}
                    </button>
                    <div>
                      <p className={cn(
                        "font-inter text-sm font-medium",
                        task.status === 'completed' ? "line-through text-silver" : "text-cream"
                      )}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="font-inter text-xs text-silver mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 font-mono text-[10px] text-pewter">
                        {task.due_at && (
                          <span className={cn(
                            "flex items-center gap-1",
                            isOverdue ? "text-negative font-bold" : "text-silver"
                          )}>
                            <Clock size={11} /> {format(new Date(task.due_at), 'dd MMM yyyy HH:mm')}
                          </span>
                        )}
                        {task.profiles && (
                          <span className="flex items-center gap-1 text-silver">
                            <User size={11} /> {task.profiles.full_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={
                      task.priority === 'urgent' ? 'negative' :
                      task.priority === 'high' ? 'warning' : 'outline'
                    } className="font-mono text-[9px] uppercase">
                      {task.priority}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
