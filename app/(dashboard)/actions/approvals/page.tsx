import { createClient } from '@/lib/supabase/server';
import { ActionService } from '@/lib/services/iq/action-service';
import ApprovalsClient from './approvals-client';

export const metadata = {
  title: 'Approval Inbox | ForecourIQ DMS',
};

export default async function ApprovalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id, role')
    .eq('id', user.id)
    .single();

  const dealershipId = profile?.dealership_id;
  if (!dealershipId) return null;

  const [pendingActions, { data: completedActions }] = await Promise.all([
    ActionService.getPendingActions(dealershipId),
    supabase
      .from('ai_actions')
      .select('*')
      .eq('dealership_id', dealershipId)
      .in('status', ['completed', 'rejected', 'failed'])
      .order('executed_at', { ascending: false })
      .limit(20),
  ]);

  return (
    <ApprovalsClient
      pendingActions={pendingActions}
      completedActions={(completedActions || []) as any[]}
    />
  );
}
