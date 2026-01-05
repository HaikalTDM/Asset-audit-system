import { api } from '@/lib/api';

export type FormattedStorageMetrics = {
  assessmentCount: number;
  imageCount: number;
  storageBytes: number;
  formattedStorageSize: string;
  formattedTotalSize: string;
  formattedFirestoreSize: string;
  lastCalculated: number;
};

export class StorageCalculationService {
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  static async calculateUserStorageMetrics(userId: string): Promise<FormattedStorageMetrics> {
    const data = await api.getMetrics(userId);
    const storageBytes = data.storageBytes || 0;
    return {
      assessmentCount: data.assessmentCount || 0,
      imageCount: data.imageCount || 0,
      storageBytes,
      formattedStorageSize: this.formatBytes(storageBytes),
      formattedTotalSize: this.formatBytes(storageBytes),
      formattedFirestoreSize: this.formatBytes(0),
      lastCalculated: data.lastCalculated || Date.now(),
    };
  }

  static async calculateSystemStorageMetrics(): Promise<FormattedStorageMetrics> {
    const data = await api.getSystemMetrics();
    const storageBytes = data.storageBytes || 0;
    return {
      assessmentCount: data.assessmentCount || 0,
      imageCount: data.imageCount || 0,
      storageBytes,
      formattedStorageSize: this.formatBytes(storageBytes),
      formattedTotalSize: this.formatBytes(storageBytes),
      formattedFirestoreSize: this.formatBytes(0),
      lastCalculated: data.lastCalculated || Date.now(),
    };
  }
}
