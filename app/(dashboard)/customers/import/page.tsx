import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CustomersImportClient from './customers-import-client';

export const metadata = { title: 'Import Customers — ForecourIQ DMS' };

export default async function CustomersImportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="px-6 py-8">
      <CustomersImportClient />
    </div>
  );
}
