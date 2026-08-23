import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ChatService } from '@/lib/services/chat/chat-service';
import TeamChatClient from './team-chat-client';

export const metadata = {
  title: 'Team Chat — ForecourIQ DMS',
};

export default async function TeamChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id')
    .eq('id', user.id)
    .single();

  if (!profile?.dealership_id) redirect('/dashboard');

  const threads = await ChatService.listThreads(profile.dealership_id, user.id);

  return (
    <div className="px-6 py-6">
      <TeamChatClient
        initialThreads={threads}
        currentUserId={user.id}
        dealershipId={profile.dealership_id}
      />
    </div>
  );
}
