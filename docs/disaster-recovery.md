# ForecourIQ DMS — Disaster Recovery Runbook

> **Version**: Phase 9  
> **RTO Target**: < 4 hours  
> **RPO Target**: < 24 hours (daily automated Supabase backups)

---

## 1. Database Recovery

Supabase provides automated daily backups on all Pro/Team plans.

### Steps
1. Log in to Supabase Dashboard → Project → Database → Backups
2. Select the most recent backup before the incident
3. Click **Restore**
4. Wait for restoration to complete (typically 5–20 min)
5. Verify database health via `GET /api/health`
6. Notify dealers via support case if data gap exists

### RLS & Security Post-Restore
After restore, always verify:
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## 2. Application Recovery

ForecourIQ DMS is deployed on Vercel with automatic deployments.

### Rollback to Previous Deployment
1. Log in to Vercel Dashboard
2. Navigate to the project → Deployments
3. Find last known good deployment
4. Click **Promote to Production**

### Environment Variables
All secrets are stored in Vercel project settings. In case of emergency re-deployment:
- Copy from `.env.example` in repository root
- Never commit real secrets to git

---

## 3. Stripe Billing Recovery

If Stripe webhooks fail:
1. Log in to Stripe Dashboard → Developers → Webhooks
2. Check recent failed events
3. Replay events: click **Redeliver** on failed webhook attempts
4. If subscription status is wrong, manually update in Supabase:
```sql
UPDATE public.subscriptions 
SET status = 'active', updated_at = NOW()
WHERE dealership_id = '<id>';
```

---

## 4. Data Import Recovery

If an import job fails mid-flight:
1. Query `data_import_jobs` table for `status = 'importing'` rows older than 30 min
2. Mark them as `failed`
3. Review `errors` JSONB column for row-level failures
4. Ask dealer to re-upload corrected CSV

---

## 5. Post-Incident Checklist

- [ ] Identify root cause
- [ ] Confirm data integrity (row counts pre/post incident)
- [ ] Update affected dealerships via support case
- [ ] Log incident in `platform_audit_logs`
- [ ] Write post-mortem in internal Notion workspace
- [ ] Update this runbook if process gaps were identified
