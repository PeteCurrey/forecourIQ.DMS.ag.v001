import { createClient } from '@/lib/supabase/server';
import IQSettingsClient from './iq-settings-client';

export const metadata = {
  title: 'IQ Operating Settings | ForecourIQ DMS',
};

export default async function IQSettingsPage() {
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

  let { data: settings } = await supabase
    .from('dealership_iq_settings')
    .select('*')
    .eq('dealership_id', dealershipId)
    .maybeSingle();

  if (!settings) {
    const { data: newSettings } = await supabase
      .from('dealership_iq_settings')
      .insert({ dealership_id: dealershipId })
      .select()
      .single();
    settings = newSettings;
  }

  return (
    <IQSettingsClient
      settings={settings as any}
      userRole={profile?.role || 'admin'}
    />
  );
}
