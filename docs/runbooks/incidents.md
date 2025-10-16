# Runbook: Incident Response

## Common Incidents
- Firestore or Storage permission errors
- Storage quota exceeded
- Sync backlog across devices

## Immediate Actions
- Check Firebase status/console for errors
- Review recent rule changes and deployments
- Temporarily disable heavy export operations

## Remediation
- Tighten or fix rules; redeploy
- Purge stale objects if over quota (with backups)
- Ask users to visit Sync Status and trigger manual sync

## Postmortem
- Document root cause, timeline, and actions
- Add tests or monitoring to prevent recurrence
