import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TransferService } from '@/lib/services/transfers/transfer-service';
import StockTransfersClient from './stock-transfers-client';

export const metadata = {
  title: 'Stock Movements & Transfers — ForecourIQ DMS',
};

export default async function StockTransfersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id, role')
    .eq('id', user.id)
    .single();

  if (!profile?.dealership_id) redirect('/dashboard');

  const [transfers, { data: locations }, { data: vehicles }] = await Promise.all([
    TransferService.listTransfers(profile.dealership_id, 'all'),
    supabase.from('dealership_locations').select('id, name, city').eq('dealership_id', profile.dealership_id),
    supabase.from('vehicles').select('id, make, model, registration, location_id').eq('dealership_id', profile.dealership_id).not('status', 'in', '("sold","completed","archived")'),
  ]);

  return (
    <div className="px-6 py-8">
      <StockTransfersClient
        initialTransfers={transfers}
        locations={locations || []}
        vehicles={vehicles || []}
        currentUserId={user.id}
      />
    </div>
  );
}
