import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SupportService } from '@/lib/services/support/support-service';
import SupportClient from './support-client';

export const metadata = {
  title: 'Support — ForecourIQ DMS',
};

export default async function SupportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id')
    .eq('id', user.id)
    .single();

  const cases = profile?.dealership_id
    ? await SupportService.listCases(profile.dealership_id)
    : [];

  return (
    <div className="px-6 py-8">
      <SupportClient initialCases={cases} />
    </div>
  );
}
