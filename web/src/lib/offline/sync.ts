import { api } from '../api';
import { deletePending, listPending, updatePendingStatus, type PendingAssessment } from './db';

export type SyncResult = {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: Array<{ assessmentId: string; error: string }>;
};

const MAX_RETRY_ATTEMPTS = 3;
const BATCH_SIZE = 3;

export async function syncPendingAssessments(): Promise<SyncResult> {
  const pending = await listPending('pending');
  const result: SyncResult = { success: true, syncedCount: 0, failedCount: 0, errors: [] };

  if (pending.length === 0) return result;

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(batch.map((item) => syncSingle(item)));
    batchResults.forEach((res, idx) => {
      const item = batch[idx];
      if (res.status === 'fulfilled' && res.value) {
        result.syncedCount += 1;
      } else {
        result.failedCount += 1;
        result.success = false;
        const error = res.status === 'rejected' ? res.reason?.message || 'Unknown error' : 'Sync failed';
        result.errors.push({ assessmentId: item.id, error });
      }
    });
  }

  return result;
}

async function syncSingle(item: PendingAssessment): Promise<boolean> {
  if (item.retryCount >= MAX_RETRY_ATTEMPTS) {
    await updatePendingStatus(item.id, 'failed', `Exceeded max retry attempts (${MAX_RETRY_ATTEMPTS})`);
    return false;
  }

  await updatePendingStatus(item.id, 'syncing');

  try {
    const form = buildFormData(item);
    await api.createAssessment(form);
    await updatePendingStatus(item.id, 'synced');
    await deletePending(item.id);
    return true;
  } catch (err: any) {
    const message = err?.message || 'Sync failed';
    await updatePendingStatus(item.id, 'failed', message);
    return false;
  }
}

function buildFormData(item: PendingAssessment) {
  const data = item.assessmentData;
  const form = new FormData();
  form.append('created_at', String(data.created_at));
  form.append('building', data.building || '');
  form.append('floor', data.floor || '');
  form.append('room', data.room || '');
  form.append('category', data.category);
  form.append('element', data.element);
  form.append('condition', String(data.condition));
  form.append('priority', String(data.priority));
  form.append('damageCategory', data.damageCategory || '');
  form.append('rootCause', data.rootCause || '');
  form.append('rootCauseDetails', data.rootCauseDetails || '');
  form.append('notes', data.notes || '');
  if (data.latitude != null) form.append('latitude', String(data.latitude));
  if (data.longitude != null) form.append('longitude', String(data.longitude));

  if (item.photoBlob) {
    const mime = item.photoMime || 'image/jpeg';
    form.append('photo', item.photoBlob, 'assessment.jpg');
    form.append('photo_mime', mime);
  } else if (data.photo_uri) {
    form.append('photo_uri', data.photo_uri);
  }

  return form;
}

export async function resetFailedToPending() {
  const failed = await listPending('failed');
  await Promise.all(failed.map((item) => updatePendingStatus(item.id, 'pending')));
}
