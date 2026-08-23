import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PlatformService } from '@/lib/services/platform/platform-service';
import { FeedbackService } from '@/lib/services/feedback/feedback-service';
import { ProductAnalyticsService } from '@/lib/services/analytics/product-analytics-service';
import PlatformClient from './platform-client';

export const metadata = { title: 'Platform Console — ForecourIQ DMS' };

export default async function PlatformPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const operator = await PlatformService.verifyPlatformOperator(user.id);
  if (!operator) redirect('/dashboard');

  const [metrics, dealerships, pilotHealth, feedbackList, workflowAdoption] = await Promise.all([
    PlatformService.getGlobalMetrics(),
    PlatformService.listDealerships(),
    PlatformService.getPilotHealthList(),
    FeedbackService.listFeedback('all', 30),
    ProductAnalyticsService.getWorkflowAdoptionReport(),
  ]);

  return (
    <div className="px-6 py-8">
      <PlatformClient
        metrics={metrics}
        dealerships={dealerships}
        pilotHealth={pilotHealth}
        feedbackList={feedbackList}
        workflowAdoption={workflowAdoption}
        operator={operator}
      />
    </div>
  );
}
