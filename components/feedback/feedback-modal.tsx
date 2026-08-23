'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { FeedbackCategory } from '@/lib/types/feedback';
import { Button } from '@/components/ui/button';
import { MessageSquare, Bug, HelpCircle, Sparkles, Gauge, MessageCircle, X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}

export default function FeedbackModal({ isOpen, onClose, userRole }: FeedbackModalProps) {
  const pathname = usePathname();
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const categories: Array<{ id: FeedbackCategory; label: string; icon: any; desc: string }> = [
    { id: 'bug', label: 'Bug / Issue', icon: Bug, desc: 'Something is broken or not working as expected' },
    { id: 'confusing', label: 'Confusing', icon: HelpCircle, desc: 'A workflow or page is unclear or difficult to navigate' },
    { id: 'feature_request', label: 'Feature Request', icon: Sparkles, desc: 'An idea or workflow enhancement for future versions' },
    { id: 'performance', label: 'Performance', icon: Gauge, desc: 'Slow loading, lag, or responsiveness issue' },
    { id: 'other', label: 'Other', icon: MessageCircle, desc: 'General pilot feedback or observation' },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMessage('Please provide both a title and description.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          title: title.trim(),
          description: description.trim(),
          route: pathname,
          appVersion: '1.0.0-rc.1',
          userRole: userRole || 'sales',
          browserInfo: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          screenshotUrl: screenshotUrl.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit feedback');
      }

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setTitle('');
        setDescription('');
        setScreenshotUrl('');
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-carbon border border-steel rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-steel pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cream" />
            <h2 className="text-sm font-semibold text-cream">DMS Feedback & Defect Report</h2>
          </div>
          <button onClick={onClose} className="text-pewter hover:text-cream">
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-12 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-semibold text-cream">Feedback Received</h3>
            <p className="text-xs text-pewter">Thank you. Your report has been logged to the ForecourIQ Release Candidate triage queue.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Category Selector */}
            <div>
              <label className="block text-xs font-medium text-pewter mb-1.5">Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map((c) => {
                  const Icon = c.icon;
                  const isSelected = category === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded border text-left text-xs transition-colors',
                        isSelected
                          ? 'bg-asphalt border-cream/50 text-cream font-semibold'
                          : 'bg-void border-steel text-pewter hover:text-cream hover:bg-asphalt/40'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-pewter mb-1">Subject / Summary *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Deposit calculation discrepancy on part-exchange"
                className="w-full bg-void border border-steel rounded-md px-3 py-2 text-xs text-cream placeholder:text-pewter focus:outline-none"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-pewter mb-1">Details & Steps to Reproduce *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Explain what happened, what you expected to happen, and any relevant details..."
                className="w-full bg-void border border-steel rounded-md px-3 py-2 text-xs text-cream placeholder:text-pewter focus:outline-none resize-none"
                required
              />
            </div>

            {/* Context Badge */}
            <div className="p-2.5 rounded bg-void border border-steel text-[11px] text-pewter flex items-center justify-between">
              <span>Auto-captured route: <strong className="text-cream font-mono">{pathname}</strong></span>
              <span className="font-mono">v1.0.0-rc.1</span>
            </div>

            {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}

            <div className="flex justify-end gap-2 pt-2 border-t border-steel">
              <Button type="button" variant="ghost" onClick={onClose} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-cream text-void hover:bg-cream/90 text-xs">
                {submitting ? 'Submitting...' : 'Submit to Platform'}
              </Button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
