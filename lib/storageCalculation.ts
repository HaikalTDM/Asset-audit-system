/**
 * Firebase Storage Calculation Service
 * Provides accurate calculation of Firebase Firestore and Storage usage
 */

import { collection, getDocs, query, where } from 'firebase/firestore';
import { ref, getMetadata, listAll } from 'firebase/storage';
import { db, storage } from '@/config/firebase.config';
import { FirestoreService, type Assessment, type UserProfile } from './firestore';

export interface StorageMetrics {
  totalDocuments: number;
  firestoreSize: number; // in bytes
  storageSize: number; // in bytes
  totalSize: number; // in bytes
  assessmentCount: number;
  imageCount: number;
  lastCalculated: number;
}

export interface FormattedStorageMetrics extends StorageMetrics {
  formattedFirestoreSize: string;
  formattedStorageSize: string;
  formattedTotalSize: string;
}

export class StorageCalculationService {
  /**
   * Calculate the approximate size of a Firestore document in bytes
   * Based on Firebase's billing documentation for document size calculation
   */
  private static calculateDocumentSize(data: any): number {
    let size = 0;
    
    // Document name overhead (minimum 1 byte per document)
    size += 1;
    
    // Calculate field sizes
    for (const [key, value] of Object.entries(data)) {
      // Field name size (UTF-8 encoded)
      size += new TextEncoder().encode(key).length;
      
      // Field value size based on type
      if (typeof value === 'string') {
        size += new TextEncoder().encode(value).length;
      } else if (typeof value === 'number') {
        size += 8; // 64-bit number
      } else if (typeof value === 'boolean') {
        size += 1;
      } else if (value === null || value === undefined) {
        size += 1;
      } else if (value instanceof Date || (typeof value === 'number' && value > 1000000000000)) {
        size += 8; // Timestamp
      } else if (Array.isArray(value)) {
        // Array overhead + element sizes
        size += 1;
        value.forEach(item => {
          size += this.calculateDocumentSize({ temp: item });
        });
      } else if (typeof value === 'object' && value !== null) {
        // Nested object
        size += this.calculateDocumentSize(value);
      } else {
        // Fallback for unknown types
        size += new TextEncoder().encode(String(value)).length;
      }
      
      // Field overhead (approximately 1 byte per field)
      size += 1;
    }
    
    return size;
  }

  /**
   * Calculate Firestore storage usage for a specific user
   */
  static async calculateFirestoreUsage(userId: string): Promise<{
    assessmentSize: number;
    userProfileSize: number;
    totalSize: number;
    documentCount: number;
  }> {
    try {
      let totalSize = 0;
      let documentCount = 0;
      
      // Calculate user profile size
      let userProfileSize = 0;
      try {
        const userProfile = await FirestoreService.getUserProfile(userId);
        if (userProfile) {
          userProfileSize = this.calculateDocumentSize(userProfile);
          totalSize += userProfileSize;
          documentCount += 1;
        }
      } catch (error) {
        console.warn('Could not calculate user profile size:', error);
      }
      
      // Calculate assessments size
      let assessmentSize = 0;
      try {
        const assessments = await FirestoreService.listAssessments(userId);
        assessments.forEach(assessment => {
          const docSize = this.calculateDocumentSize(assessment);
          assessmentSize += docSize;
          totalSize += docSize;
          documentCount += 1;
        });
      } catch (error) {
        console.warn('Could not calculate assessments size:', error);
      }
      
      return {
        assessmentSize,
        userProfileSize,
        totalSize,
        documentCount
      };
    } catch (error) {
      console.error('Error calculating Firestore usage:', error);
      throw new Error(`Failed to calculate Firestore usage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate Firebase Storage usage for a specific user
   */
  static async calculateStorageUsage(userId: string): Promise<{
    totalSize: number;
    fileCount: number;
    files: Array<{ name: string; size: number; url: string }>;
  }> {
    try {
      let totalSize = 0;
      let fileCount = 0;
      const files: Array<{ name: string; size: number; url: string }> = [];
      
      // List all files in the user's assessment folder
      const userFolderRef = ref(storage, `assessments/${userId}`);
      
      try {
        const listResult = await listAll(userFolderRef);
        
        // Get metadata for each file to calculate size
        const metadataPromises = listResult.items.map(async (itemRef) => {
          try {
            const metadata = await getMetadata(itemRef);
            const size = metadata.size || 0;
            totalSize += size;
            fileCount += 1;
            
            files.push({
              name: itemRef.name,
              size: size,
              url: itemRef.fullPath
            });
            
            return size;
          } catch (error) {
            console.warn(`Could not get metadata for ${itemRef.fullPath}:`, error);
            return 0;
          }
        });
        
        await Promise.all(metadataPromises);
      } catch (error) {
        // If the folder doesn't exist or is empty, that's okay
        console.log('No storage files found for user (this is normal for new users):', error);
      }
      
      return {
        totalSize,
        fileCount,
        files
      };
    } catch (error) {
      console.error('Error calculating Storage usage:', error);
      throw new Error(`Failed to calculate Storage usage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate comprehensive storage metrics for a user
   */
  static async calculateUserStorageMetrics(userId: string): Promise<StorageMetrics> {
    try {
      // Calculate Firestore usage
      const firestoreUsage = await this.calculateFirestoreUsage(userId);
      
      // Calculate Storage usage
      const storageUsage = await this.calculateStorageUsage(userId);
      
      // Get assessment count
      const assessments = await FirestoreService.listAssessments(userId);
      
      const metrics: StorageMetrics = {
        totalDocuments: firestoreUsage.documentCount,
        firestoreSize: firestoreUsage.totalSize,
        storageSize: storageUsage.totalSize,
        totalSize: firestoreUsage.totalSize + storageUsage.totalSize,
        assessmentCount: assessments.length,
        imageCount: storageUsage.fileCount,
        lastCalculated: Date.now()
      };
      
      return metrics;
    } catch (error) {
      console.error('Error calculating user storage metrics:', error);
      throw new Error(`Failed to calculate storage metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Format bytes into human-readable format
   */
  static formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Get formatted storage metrics with human-readable sizes
   */
  static async getFormattedUserStorageMetrics(userId: string): Promise<FormattedStorageMetrics> {
    const metrics = await this.calculateUserStorageMetrics(userId);
    
    return {
      ...metrics,
      formattedFirestoreSize: this.formatBytes(metrics.firestoreSize),
      formattedStorageSize: this.formatBytes(metrics.storageSize),
      formattedTotalSize: this.formatBytes(metrics.totalSize)
    };
  }

  /**
   * Calculate storage metrics for all users (admin only)
   */
  static async calculateSystemStorageMetrics(): Promise<{
    totalUsers: number;
    totalDocuments: number;
    totalFirestoreSize: number;
    totalStorageSize: number;
    totalSystemSize: number;
    userBreakdown: Array<{
      userId: string;
      email: string;
      metrics: StorageMetrics;
    }>;
  }> {
    try {
      // Get all users
      const users = await FirestoreService.listAllUsers();
      
      let totalDocuments = 0;
      let totalFirestoreSize = 0;
      let totalStorageSize = 0;
      const userBreakdown: Array<{
        userId: string;
        email: string;
        metrics: StorageMetrics;
      }> = [];
      
      // Calculate metrics for each user
      for (const user of users) {
        try {
          const userMetrics = await this.calculateUserStorageMetrics(user.id);
          
          totalDocuments += userMetrics.totalDocuments;
          totalFirestoreSize += userMetrics.firestoreSize;
          totalStorageSize += userMetrics.storageSize;
          
          userBreakdown.push({
            userId: user.id,
            email: user.email,
            metrics: userMetrics
          });
        } catch (error) {
          console.warn(`Could not calculate metrics for user ${user.id}:`, error);
          // Add empty metrics for failed calculations
          userBreakdown.push({
            userId: user.id,
            email: user.email,
            metrics: {
              totalDocuments: 0,
              firestoreSize: 0,
              storageSize: 0,
              totalSize: 0,
              assessmentCount: 0,
              imageCount: 0,
              lastCalculated: Date.now()
            }
          });
        }
      }
      
      return {
        totalUsers: users.length,
        totalDocuments,
        totalFirestoreSize,
        totalStorageSize,
        totalSystemSize: totalFirestoreSize + totalStorageSize,
        userBreakdown
      };
    } catch (error) {
      console.error('Error calculating system storage metrics:', error);
      throw new Error(`Failed to calculate system storage metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
