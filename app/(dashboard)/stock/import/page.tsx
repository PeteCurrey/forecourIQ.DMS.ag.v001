import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import StockImportClient from './stock-import-client';

export const metadata = { title: 'Import Stock — ForecourIQ DMS' };

export default async function StockImportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="px-6 py-8">
      <StockImportClient />
    </div>
  );
}
