# ForecourIQ DMS — Incident Response Plan

> **Audience**: Platform Operators, On-Call Engineering  
> **Version**: Phase 9  
> **Classification**: Internal Operational Plan

---

## 1. Incident Severity Triage

| Level | Definition | Response Timeline | Escalation |
|---|---|---|---|
| **SEV-0** | Global platform outage or verified cross-tenant data leak. | Immediate (< 15 min) | Lead Engineer & Platform Owner |
| **SEV-1** | Multiple dealerships experiencing degradation (e.g. AI layer down, DVLA lookups failing). | < 1 Hour | Engineering Team |
| **SEV-2** | Single dealership specific issue (e.g. Stripe webhook desync, import job stalled). | < 4 Hours | Support Operator |
| **SEV-3** | Non-blocking bug or minor UI anomaly. | Next Sprint | Bug Backlog |

---

## 2. Circuit Breaker Procedures

### Dealership Pilot Pause (`PlatformService.pausePilot`)
In case of suspected malicious activity or critical data corruption at a pilot dealer:
1. Navigate to `/platform`.
2. Locate the dealership and click **⏸ Pause Pilot**.
3. Supply the reason. The dealership's `lifecycle_status` will transition to `suspended`.

### IQ Operating Layer Emergency Halt (`automation_paused`)
To instantly freeze all AI autonomous suggestions and automated actions across a dealership:
- Toggle `automation_paused = true` in `/settings/iq` or via SQL:
```sql
UPDATE dealership_iq_settings SET automation_paused = true WHERE dealership_id = '<id>';
```

---

## 3. Communication Templates

### Dealer Notification (P0 Incident)
> "Dear ForecourIQ Partner, We are currently investigating an issue affecting [SERVICE_NAME]. Our engineering team is actively remediating the service. Your vehicle data and customer records remain secure. Next update in 30 minutes."
