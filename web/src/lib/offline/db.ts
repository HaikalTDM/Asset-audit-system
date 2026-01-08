import Dexie, { type Table } from 'dexie';

export type AssessmentPayload = {
  userId: string;
  created_at: number;
  building?: string;
  floor?: string;
  room?: string;
  category: string;
  element: string;
  condition: number;
  priority: number;
  damageCategory?: string;
  rootCause?: string;
  rootCauseDetails?: string;
  notes?: string;
  latitude?: number | null;
  longitude?: number | null;
  photo_uri?: string;
};

export type PendingAssessment = {
  id: string;
  assessmentData: AssessmentPayload;
  photoBlob?: Blob;
  photoMime?: string;
  createdAt: number;
  syncStatus: 'pending' | 'syncing' | 'failed' | 'synced';
  retryCount: number;
  errorMessage?: string;
};

class OfflineDb extends Dexie {
  pendingAssessments!: Table<PendingAssessment, string>;

  constructor() {
    super('asset_audit_offline');
    this.version(1).stores({
      pendingAssessments: 'id, syncStatus, createdAt',
    });
  }
}

export const db = new OfflineDb();

export async function savePendingAssessment(item: PendingAssessment) {
  await db.pendingAssessments.put(item);
}

export async function listPending(status: 'pending' | 'failed' | 'syncing' | 'synced') {
  return db.pendingAssessments.where('syncStatus').equals(status).toArray();
}

export async function listAllPending() {
  return db.pendingAssessments.toArray();
}

export async function getPendingCount() {
  const pending = await db.pendingAssessments.where('syncStatus').anyOf(['pending', 'failed', 'syncing']).count();
  return pending;
}

export async function updatePendingStatus(id: string, status: PendingAssessment['syncStatus'], errorMessage?: string) {
  const current = await db.pendingAssessments.get(id);
  if (!current) return;
  const retryCount = status === 'failed' ? (current.retryCount || 0) + 1 : current.retryCount || 0;
  await db.pendingAssessments.update(id, { syncStatus: status, errorMessage: errorMessage || undefined, retryCount });
}

export async function deletePending(id: string) {
  await db.pendingAssessments.delete(id);
}
