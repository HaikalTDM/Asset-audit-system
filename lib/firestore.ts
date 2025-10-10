import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where, orderBy, setDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '@/config/firebase.config';
import { ImageUploadService } from './imageUpload';

export type UserRole = 'staff' | 'admin';

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  created_at: number;
  updated_at: number;
  isActive: boolean;
};

export type Assessment = {
  id: string; // Now required since we always generate custom IDs
  userId: string;
  created_at: number;
  latitude: number | null;
  longitude: number | null;
  category: string;
  element: string;
  condition: number;
  priority: number;
  photo_uri: string;
  notes: string;
};

export class FirestoreService {
  // User Profile Management
  static async createUserProfile(userId: string, email: string, displayName: string, role: UserRole = 'staff') {
    try {
      const userProfile: UserProfile = {
        id: userId,
        email,
        displayName,
        role,
        created_at: Date.now(),
        updated_at: Date.now(),
        isActive: true,
      };

      await setDoc(doc(db, 'users', userId), userProfile);
      return userProfile;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  static async updateUserRole(userId: string, role: UserRole) {
    try {
      const docRef = doc(db, 'users', userId);
      await updateDoc(docRef, {
        role,
        updated_at: Date.now(),
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  static async updateUserActiveStatus(userId: string, isActive: boolean) {
    try {
      const docRef = doc(db, 'users', userId);
      await updateDoc(docRef, {
        isActive: isActive,
        updated_at: Date.now(),
      });
    } catch (error) {
      console.error('Error updating user active status:', error);
      throw error;
    }
  }

  static async deleteUser(userId: string) {
    try {
      // Delete all user's assessments first
      const assessmentsQuery = query(
        collection(db, 'assessments'),
        where('userId', '==', userId)
      );
      const assessmentsSnapshot = await getDocs(assessmentsQuery);
      
      // Delete all assessments and their photos
      const deletePromises = assessmentsSnapshot.docs.map(async (assessmentDoc) => {
        // Delete from firestore
        await deleteDoc(assessmentDoc.ref);
        
        // Delete associated photo from storage if it exists
        const assessment = assessmentDoc.data();
        if (assessment.photo_uri) {
          try {
            // Extract the path from the URL
            const photoPath = assessment.photo_uri.split('/o/')[1]?.split('?')[0];
            if (photoPath) {
              const decodedPath = decodeURIComponent(photoPath);
              const photoRef = ref(storage, decodedPath);
              await deleteObject(photoRef);
            }
          } catch (photoError) {
            console.warn('Error deleting photo:', photoError);
            // Continue even if photo deletion fails
          }
        }
      });
      
      await Promise.all(deletePromises);
      
      // Finally, delete the user document
      const userDocRef = doc(db, 'users', userId);
      await deleteDoc(userDocRef);
      
      console.log(`Deleted user ${userId} and ${assessmentsSnapshot.docs.length} assessments`);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  static async listAllUsers(): Promise<UserProfile[]> {
    try {
      const q = query(collection(db, 'users'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as UserProfile);
    } catch (error: any) {
      console.error('Error listing users:', error);

      // Provide helpful error messages for common issues
      if (error?.code === 'permission-denied') {
        throw new Error('Permission denied: Please ensure Firebase security rules are properly configured. See FIREBASE_RULES_DEVELOPMENT.md for immediate fix.');
      }

      throw new Error(`Failed to load users: ${error?.message || 'Unknown error'}`);
    }
  }

  // Helper function to pad numbers with leading zeros
  private static pad2(n: number): string {
    return String(n).padStart(2, '0');
  }

  // Helper function to pad sequence numbers with leading zeros (5 digits)
  private static pad5(n: number): string {
    return String(n).padStart(5, '0');
  }

  // Generate custom assessment ID in format: ddmmyyyy-00001
  private static async generateCustomAssessmentId(): Promise<string> {
    try {
      const now = new Date();
      const day = this.pad2(now.getDate());
      const month = this.pad2(now.getMonth() + 1);
      const year = now.getFullYear();
      const prefix = `${day}${month}${year}-`;

      console.log('Generating custom ID with prefix:', prefix);

      // Get all assessments and filter client-side (since we can't query by document ID)
      const q = query(collection(db, 'assessments'));
      const querySnapshot = await getDocs(q);

      console.log('Total assessments found:', querySnapshot.size);

      let maxSequence = 0;

      // Filter and find the highest sequence for today's prefix
      querySnapshot.docs.forEach(doc => {
        const docId = doc.id;
        if (docId.startsWith(prefix)) {
          console.log('Found matching assessment ID:', docId);
          const sequencePart = docId.split('-')[1];
          if (sequencePart) {
            const sequenceNum = parseInt(sequencePart, 10);
            if (!isNaN(sequenceNum)) {
              maxSequence = Math.max(maxSequence, sequenceNum);
              console.log('Current max sequence:', maxSequence);
            }
          }
        }
      });

      const nextSequence = maxSequence + 1;
      const customId = `${prefix}${this.pad5(nextSequence)}`;

      console.log('Generated custom ID:', customId);
      return customId;

    } catch (error) {
      console.error('Error generating custom assessment ID:', error);
      // Fallback to timestamp-based ID if custom generation fails
      const now = new Date();
      const day = this.pad2(now.getDate());
      const month = this.pad2(now.getMonth() + 1);
      const year = now.getFullYear();
      const timestamp = Date.now();
      const fallbackId = `${day}${month}${year}-${timestamp}`;
      console.log('Using fallback ID:', fallbackId);
      return fallbackId;
    }
  }

  // Assessment Management
  static async createAssessment(assessment: Omit<Assessment, 'id'>) {
    try {
      const customId = await this.generateCustomAssessmentId();
      const assessmentWithId = { ...assessment, id: customId };

      // Use setDoc with custom ID instead of addDoc
      await setDoc(doc(db, 'assessments', customId), assessmentWithId);

      return assessmentWithId;
    } catch (error) {
      console.error('Error creating assessment:', error);
      throw error;
    }
  }

  static async createAssessmentWithImageUpload(assessmentData: Omit<Assessment, 'id'>) {
    try {
      console.log('Starting assessment creation with image upload...');

      // Generate custom assessment ID first
      const customId = await this.generateCustomAssessmentId();
      console.log('Generated custom ID for assessment:', customId);

      // Upload the image to Firebase Storage using the custom ID
      console.log('Uploading image to Firebase Storage...');
      const downloadURL = await ImageUploadService.uploadImageWithRetry(
        assessmentData.photo_uri,
        assessmentData.userId,
        customId
      );
      console.log('Image uploaded successfully, URL:', downloadURL);

      // Create the assessment with the Firebase Storage URL and custom ID
      const assessmentWithStorageUrl = {
        ...assessmentData,
        id: customId,
        photo_uri: downloadURL
      };

      console.log('Creating Firestore document with ID:', customId);
      // Use setDoc with custom ID instead of addDoc
      await setDoc(doc(db, 'assessments', customId), assessmentWithStorageUrl);
      console.log('Assessment created successfully in Firestore');

      return assessmentWithStorageUrl;
    } catch (error) {
      console.error('Error creating assessment with image upload:', error);

      // Provide more context in the error message
      if (error instanceof Error) {
        throw new Error(`Failed to create assessment: ${error.message}`);
      } else {
        throw new Error('Failed to create assessment: Unknown error occurred');
      }
    }
  }

  static async listAssessments(userId: string) {
    try {
      const q = query(
        collection(db, 'assessments'),
        where('userId', '==', userId),
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Assessment[];
    } catch (error) {
      console.error('Error listing assessments:', error);
      throw error;
    }
  }

  static async listAllAssessments(): Promise<Assessment[]> {
    try {
      const q = query(
        collection(db, 'assessments'),
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Assessment[];
    } catch (error: any) {
      console.error('Error listing all assessments:', error);

      // Provide helpful error messages for common issues
      if (error?.code === 'permission-denied') {
        throw new Error('Permission denied: Please ensure Firebase security rules are properly configured. See FIREBASE_RULES_DEVELOPMENT.md for immediate fix.');
      }

      if (error?.code === 'failed-precondition') {
        throw new Error('Database index required: Please create the necessary Firestore indexes.');
      }

      throw new Error(`Failed to load assessments: ${error?.message || 'Unknown error'}`);
    }
  }

  static async getAssessment(id: string) {
    try {
      const docRef = doc(db, 'assessments', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Assessment;
      }
      throw new Error('Assessment not found');
    } catch (error) {
      console.error('Error getting assessment:', error);
      throw error;
    }
  }

  static async updateAssessment(id: string, data: Partial<Assessment>) {
    try {
      const docRef = doc(db, 'assessments', id);
      await updateDoc(docRef, data);
      return { id, ...data };
    } catch (error) {
      console.error('Error updating assessment:', error);
      throw error;
    }
  }

  static async deleteAssessment(id: string) {
    try {
      // First, get the assessment to retrieve the image URL and user ID
      const assessment = await this.getAssessment(id);

      // Delete the Firestore document
      const docRef = doc(db, 'assessments', id);
      await deleteDoc(docRef);

      // Delete the associated image from Firebase Storage
      try {
        if (assessment.photo_uri) {
          // Try to delete using the download URL first (more reliable)
          await ImageUploadService.deleteImageByUrl(assessment.photo_uri);
        } else {
          // Fallback: delete using userId and assessmentId
          await ImageUploadService.deleteImage(assessment.userId, id);
        }
      } catch (imageError) {
        // Log the error but don't fail the entire operation
        // The assessment document is already deleted, so this is just cleanup
        console.warn('Failed to delete associated image, but assessment was deleted successfully:', imageError);
      }

      console.log(`Successfully deleted assessment ${id} and its associated image`);
    } catch (error) {
      console.error('Error deleting assessment:', error);
      throw error;
    }
  }

  // Clear all user data (for staff users - only their own data)
  static async clearUserData(userId: string): Promise<void> {
    try {
      // Get all user's assessments
      const assessments = await this.listAssessments(userId);

      // Delete all assessments (this will also delete their images)
      const deletePromises = assessments.map(assessment =>
        assessment.id ? this.deleteAssessment(assessment.id) : Promise.resolve()
      );

      await Promise.all(deletePromises);
      console.log(`Cleared ${assessments.length} assessments and their images for user ${userId}`);
    } catch (error) {
      console.error('Error clearing user data:', error);
      throw error;
    }
  }

  // Clear all system data (admin only)
  static async clearAllSystemData(): Promise<void> {
    try {
      // Get all assessments
      const assessments = await this.listAllAssessments();

      // Delete all assessments (this will also delete their images)
      const deletePromises = assessments.map(assessment =>
        assessment.id ? this.deleteAssessment(assessment.id) : Promise.resolve()
      );

      await Promise.all(deletePromises);
      console.log(`Cleared ${assessments.length} total assessments and their images from system`);
    } catch (error) {
      console.error('Error clearing all system data:', error);
      throw error;
    }
  }

  // Test function to verify custom ID generation (for debugging)
  static async testCustomIdGeneration(): Promise<string> {
    console.log('Testing custom ID generation...');
    const testId = await this.generateCustomAssessmentId();
    console.log('Test ID generated:', testId);
    return testId;
  }
}