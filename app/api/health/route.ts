import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, { status: 'ok' | 'error'; latencyMs?: number; detail?: string }> = {};

  // 1. Database connectivity
  try {
    const supabase = await createClient();
    const t0 = Date.now();
    const { error } = await supabase.from('dealerships').select('id').limit(1);
    checks.database = {
      status: error ? 'error' : 'ok',
      latencyMs: Date.now() - t0,
      detail: error?.message,
    };
  } catch (err: any) {
    checks.database = { status: 'error', detail: err.message };
  }

  // 2. Environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  checks.environment = {
    status: missingVars.length === 0 ? 'ok' : 'error',
    detail: missingVars.length > 0 ? `Missing: ${missingVars.join(', ')}` : undefined,
  };

  const allHealthy = Object.values(checks).every(c => c.status === 'ok');
  const totalMs = Date.now() - startTime;

  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '9.0.0',
      latencyMs: totalMs,
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  );
}
