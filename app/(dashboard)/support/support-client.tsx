'use client';

import { useState } from 'react';
import { SupportCase, SupportCategory, SupportPriority } from '@/lib/types/platform';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SupportClientProps {
  initialCases: SupportCase[];
}

const categoryLabels: Record<SupportCategory, string> = {
  account: 'Account', billing: 'Billing', stock: 'Stock', website: 'Website',
  integration: 'Integrations', crm: 'CRM', deal: 'Deal Desk', compliance: 'Compliance',
  iq: 'IQ Operating Layer', technical: 'Technical', other: 'General',
};

const priorityColors: Record<SupportPriority, string> = {
  normal: 'bg-[var(--steel)] text-[var(--pewter)]',
  high: 'bg-amber-50 text-amber-700 border-amber-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
};

const statusColors: Record<string, string> = {
  open: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  waiting_on_customer: 'bg-purple-50 text-purple-700',
  waiting_on_forecouriq: 'bg-orange-50 text-orange-700',
  resolved: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-[var(--steel)] text-[var(--pewter)]',
};

const statusLabels: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  waiting_on_customer: 'Awaiting You',
  waiting_on_forecouriq: 'With ForecourIQ',
  resolved: 'Resolved',
  closed: 'Closed',
};

export default function SupportClient({ initialCases }: SupportClientProps) {
  const [cases, setCases] = useState<SupportCase[]>(initialCases);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<SupportCategory>('technical');
  const [priority, setPriority] = useState<SupportPriority>('normal');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setError('Subject and description are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/support/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, priority, subject, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');
      setCases(prev => [data.supportCase, ...prev]);
      setShowForm(false);
      setSubject('');
      setDescription('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const openCases = cases.filter(c => !['resolved', 'closed'].includes(c.status));
  const closedCases = cases.filter(c => ['resolved', 'closed'].includes(c.status));

  return (
    <div className="max-w-4xl mx-auto space-y-8 reveal-1">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--cream)] tracking-tight">Support</h1>
          <p className="text-sm text-[var(--pewter)] mt-1">
            Contact ForecourIQ for help with your account, billing, or platform.
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-[var(--cream)] text-[var(--void)] hover:bg-[var(--cream)]/90 text-sm"
        >
          {showForm ? 'Cancel' : '+ New Case'}
        </Button>
      </div>

      {/* New Case Form */}
      {showForm && (
        <div className="bg-[var(--carbon)] border border-[var(--steel)] rounded-lg p-6 space-y-5 reveal-2">
          <h2 className="text-base font-medium text-[var(--cream)]">Open a Support Case</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--pewter)] mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as SupportCategory)}
                  className="w-full bg-[var(--void)] border border-[var(--steel)] rounded-md px-3 py-2 text-sm text-[var(--cream)] focus:outline-none focus:ring-1 focus:ring-[var(--cream)]/30"
                >
                  {Object.entries(categoryLabels).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--pewter)] mb-1.5">Priority</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as SupportPriority)}
                  className="w-full bg-[var(--void)] border border-[var(--steel)] rounded-md px-3 py-2 text-sm text-[var(--cream)] focus:outline-none focus:ring-1 focus:ring-[var(--cream)]/30"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--pewter)] mb-1.5">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Brief description of the issue"
                className="w-full bg-[var(--void)] border border-[var(--steel)] rounded-md px-3 py-2 text-sm text-[var(--cream)] placeholder:text-[var(--pewter)] focus:outline-none focus:ring-1 focus:ring-[var(--cream)]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--pewter)] mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                placeholder="Provide as much context as possible to help us resolve your issue quickly..."
                className="w-full bg-[var(--void)] border border-[var(--steel)] rounded-md px-3 py-2 text-sm text-[var(--cream)] placeholder:text-[var(--pewter)] focus:outline-none focus:ring-1 focus:ring-[var(--cream)]/30 resize-none"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="text-sm">Cancel</Button>
              <Button type="submit" disabled={submitting} className="bg-[var(--cream)] text-[var(--void)] hover:bg-[var(--cream)]/90 text-sm">
                {submitting ? 'Submitting...' : 'Submit Case'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Open Cases */}
      {openCases.length > 0 && (
        <div className="reveal-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--pewter)] mb-4">
            Active Cases ({openCases.length})
          </h2>
          <div className="space-y-2">
            {openCases.map(c => (
              <CaseRow key={c.id} supportCase={c} />
            ))}
          </div>
        </div>
      )}

      {/* Closed Cases */}
      {closedCases.length > 0 && (
        <div className="reveal-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--pewter)] mb-4">
            Resolved & Closed
          </h2>
          <div className="space-y-2">
            {closedCases.map(c => (
              <CaseRow key={c.id} supportCase={c} muted />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {cases.length === 0 && !showForm && (
        <div className="reveal-2 text-center py-20 text-[var(--pewter)]">
          <p className="text-sm">No support cases yet.</p>
          <p className="text-xs mt-1">Open a case if you need help with your account or platform.</p>
        </div>
      )}
    </div>
  );
}

function CaseRow({ supportCase, muted }: { supportCase: SupportCase; muted?: boolean }) {
  const statusColor = statusColors[supportCase.status] || 'bg-[var(--steel)] text-[var(--pewter)]';
  const priorityColor = priorityColors[supportCase.priority] || '';
  const categoryLabel = categoryLabels[supportCase.category] || supportCase.category;

  const openedDate = new Date(supportCase.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  return (
    <div className={cn(
      'bg-[var(--carbon)] border border-[var(--steel)] rounded-lg px-5 py-4 flex items-center gap-4',
      muted && 'opacity-60'
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-[var(--pewter)]">{supportCase.case_number}</span>
          <span className={cn('text-xs px-2 py-0.5 rounded-full border', priorityColor)}>
            {supportCase.priority}
          </span>
          <span className="text-xs text-[var(--pewter)]">{categoryLabel}</span>
        </div>
        <p className="text-sm font-medium text-[var(--cream)] truncate">{supportCase.subject}</p>
        <p className="text-xs text-[var(--pewter)] mt-0.5">Opened {openedDate}</p>
      </div>
      <span className={cn('text-xs px-3 py-1 rounded-full font-medium', statusColor)}>
        {statusLabels[supportCase.status] || supportCase.status}
      </span>
    </div>
  );
}
