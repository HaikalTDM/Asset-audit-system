import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/config/firebase.config';
import * as FileSystem from 'expo-file-system';

export class ImageUploadService {
  /**
   * Uploads an image to Firebase Storage and returns the download URL
   * @param imageUri - Local file URI of the image
   * @param userId - User ID to organize images by user
   * @param assessmentId - Assessment ID for unique naming
   * @returns Promise<string> - Download URL of the uploaded image
   */
  static async uploadImage(imageUri: string, userId: string, assessmentId: string): Promise<string> {
    try {
      // Read the image file as a blob
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();

      // Validate that we have a valid image blob
      if (blob.size === 0) {
        throw new Error('Image file is empty');
      }

      // Create a reference to the storage location
      const imageRef = ref(storage, `assessments/${userId}/${assessmentId}.jpg`);

      // Upload the image
      const snapshot = await uploadBytes(imageRef, blob);

      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Uploads an image with retry logic for better reliability
   * @param imageUri - Local file URI of the image
   * @param userId - User ID to organize images by user
   * @param assessmentId - Assessment ID for unique naming
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   * @returns Promise<string> - Download URL of the uploaded image
   */
  static async uploadImageWithRetry(
    imageUri: string, 
    userId: string, 
    assessmentId: string, 
    maxRetries: number = 3
  ): Promise<string> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.uploadImage(imageUri, userId, assessmentId);
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * Validates if the image URI is accessible before upload
   * @param imageUri - Local file URI to validate
   * @returns Promise<boolean> - True if image is accessible
   */
  static async validateImageUri(imageUri: string): Promise<boolean> {
    try {
      // Check if URI exists and is not empty
      if (!imageUri || imageUri.trim() === '') {
        return false;
      }

      // For file:// URIs (mobile platforms)
      if (imageUri.startsWith('file://')) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(imageUri);
          return fileInfo.exists;
        } catch (fileError) {
          // If FileSystem check fails, try to fetch the URI as fallback
          return await this.validateByFetch(imageUri);
        }
      }

      // For blob:// URIs (web platforms)
      if (imageUri.startsWith('blob:')) {
        return await this.validateByFetch(imageUri);
      }

      // For data: URIs (base64 encoded images)
      if (imageUri.startsWith('data:')) {
        return imageUri.includes('data:image/') && imageUri.includes('base64,');
      }

      // For http/https URIs
      if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
        return await this.validateByFetch(imageUri);
      }

      // For any other URI format, try to fetch it
      return await this.validateByFetch(imageUri);

    } catch (error) {
      return false;
    }
  }

  /**
   * Deletes an image from Firebase Storage
   * @param userId - User ID to locate the image
   * @param assessmentId - Assessment ID for the image filename
   * @returns Promise<void>
   */
  static async deleteImage(userId: string, assessmentId: string): Promise<void> {
    try {
      // Create a reference to the storage location (same path as upload)
      const imageRef = ref(storage, `assessments/${userId}/${assessmentId}.jpg`);

      // Delete the image
      await deleteObject(imageRef);

      console.log(`Successfully deleted image for assessment ${assessmentId}`);
    } catch (error: any) {
      // If the file doesn't exist, that's okay - it might have been deleted already
      if (error?.code === 'storage/object-not-found') {
        console.log(`Image for assessment ${assessmentId} was already deleted or doesn't exist`);
        return;
      }

      console.error('Error deleting image from Firebase Storage:', error);
      throw new Error(`Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deletes an image from Firebase Storage using the download URL
   * This method extracts the path from the URL and deletes the file
   * @param downloadUrl - The Firebase Storage download URL
   * @returns Promise<void>
   */
  static async deleteImageByUrl(downloadUrl: string): Promise<void> {
    try {
      // Extract the storage path from the download URL
      // Firebase Storage URLs have the format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?{params}
      const url = new URL(downloadUrl);
      const pathMatch = url.pathname.match(/\/o\/(.+)$/);

      if (!pathMatch) {
        throw new Error('Invalid Firebase Storage URL format');
      }

      // Decode the path (Firebase Storage URLs encode the path)
      const storagePath = decodeURIComponent(pathMatch[1]);

      // Create a reference and delete
      const imageRef = ref(storage, storagePath);
      await deleteObject(imageRef);

      console.log(`Successfully deleted image at path: ${storagePath}`);
    } catch (error: any) {
      // If the file doesn't exist, that's okay - it might have been deleted already
      if (error?.code === 'storage/object-not-found') {
        console.log(`Image was already deleted or doesn't exist`);
        return;
      }

      console.error('Error deleting image by URL from Firebase Storage:', error);
      throw new Error(`Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Helper method to validate URI by attempting to fetch it
   * @param imageUri - URI to validate
   * @returns Promise<boolean> - True if URI is accessible
   */
  private static async validateByFetch(imageUri: string): Promise<boolean> {
    try {
      const response = await fetch(imageUri, { method: 'HEAD' });
      return response.ok;
    } catch (fetchError) {
      // If HEAD request fails, try a GET request (some servers don't support HEAD)
      try {
        const response = await fetch(imageUri);
        return response.ok;
      } catch (getError) {
        return false;
      }
    }
  }
}
