# Playbook: Offline Troubleshooting

## Symptoms
- Pending count not decreasing
- Sync stuck at poor network
- Failed assessments accumulating

## Checks
- Verify network icon/status in header and Sync Status screen.
- Ensure user is active and authenticated.
- Confirm Storage/Firestore permissions in Firebase Console.

## Actions
- Manual Sync in Sync Status screen.
- Retry Failed or Retry single assessment.
- Reset retry count for a specific item.
- Improve network quality (Wi-Fi instead of cellular) and retry.

## Cleanups
- Clear synced items after N days (configurable in code).
- If necessary, export data before destructive operations.
