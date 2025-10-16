# Runbook: Release Preparation

## Pre-Release Checklist
- [ ] Update docs and changelog
- [ ] Verify Firebase rules are the hardened versions
- [ ] Verify environment configs in `config/firebase.config.ts`
- [ ] Smoke-test staff and admin flows
- [ ] Validate storage metrics screen
- [ ] Confirm offline sync works on device (airplane mode test)

## Versioning
- Bump app version in app config; tag release in VCS.

## Rollout
- Stage rollout; monitor errors and quotas in Firebase Console.
