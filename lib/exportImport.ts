import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { FirestoreService } from './firestore';

function csvEscape(s: string | number | null) {
  if (s === null || s === undefined) return '';
  const str = String(s);
  const needs = str.includes(',') || str.includes('\n') || str.includes('"');
  const out = str.replace(/"/g, '""');
  return needs ? `"${out}"` : out;
}

function formatDate(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

async function fileExists(uri: string) {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return !!info.exists;
  } catch {
    return false;
  }
}

export interface ExportFilters {
  startDate?: Date;
  endDate?: Date;
  month?: number; // 1-12
  year?: number;
}

/**
 * Export assessments to CSV file with clickable image URLs
 * @param userId - User ID to export assessments for (optional, exports all if admin)
 * @param filters - Optional date filters (month, year, or custom date range)
 */
export async function exportCSV(userId?: string, filters?: ExportFilters) {
  try {
    // Fetch assessments from Firestore
    let assessments = userId 
      ? await FirestoreService.listUserAssessments(userId)
      : await FirestoreService.listAllAssessments();

    // Apply date filters if provided
    if (filters) {
      assessments = assessments.filter(assessment => {
        const assessmentDate = new Date(assessment.created_at);
        
        // Filter by month and year
        if (filters.month !== undefined && filters.year !== undefined) {
          const assessmentMonth = assessmentDate.getMonth() + 1; // 0-based to 1-based
          const assessmentYear = assessmentDate.getFullYear();
          return assessmentMonth === filters.month && assessmentYear === filters.year;
        }
        
        // Filter by custom date range
        if (filters.startDate && filters.endDate) {
          return assessmentDate >= filters.startDate && assessmentDate <= filters.endDate;
        }
        
        // Filter by start date only
        if (filters.startDate) {
          return assessmentDate >= filters.startDate;
        }
        
        // Filter by end date only
        if (filters.endDate) {
          return assessmentDate <= filters.endDate;
        }
        
        return true;
      });
    }

    if (assessments.length === 0) {
      throw new Error('No assessments found for the selected period');
    }

    // CSV header with descriptive columns
    const header = [
      'Assessment ID',
      'Date Created',
      'Category',
      'Element',
      'Condition',
      'Condition Label',
      'Priority',
      'Priority Label',
      'Latitude',
      'Longitude',
      'Notes',
      'Photo URL',
      'User ID'
    ];
    
    const lines: string[] = [header.join(',')];

    // Helper function to get condition label
    const getConditionLabel = (condition: number) => {
      const labels = ['', 'Excellent', 'Good', 'Fair', 'Poor', 'Critical'];
      return labels[condition] || 'Unknown';
    };

    // Helper function to get priority label
    const getPriorityLabel = (priority: number) => {
      const labels = ['', 'Very High', 'High', 'Medium', 'Low', 'Very Low'];
      return labels[priority] || 'Unknown';
    };

    // Add each assessment as a row
    for (const assessment of assessments) {
      const row = [
        csvEscape(assessment.id),
        csvEscape(formatDate(assessment.created_at)),
        csvEscape(assessment.category),
        csvEscape(assessment.element),
        csvEscape(assessment.condition),
        csvEscape(getConditionLabel(assessment.condition)),
        csvEscape(assessment.priority),
        csvEscape(getPriorityLabel(assessment.priority)),
        csvEscape(assessment.latitude),
        csvEscape(assessment.longitude),
        csvEscape(assessment.notes),
        csvEscape(assessment.photo_uri), // Firebase Storage URL - clickable in Excel/Sheets
        csvEscape(assessment.userId),
      ];
      lines.push(row.join(','));
    }

    // Create CSV content
    const csvContent = lines.join('\n');
    
    // Save to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `asset-audit-export-${timestamp}.csv`;
    const filePath = FileSystem.cacheDirectory! + filename;
    
    await FileSystem.writeAsStringAsync(filePath, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Share the file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Asset Audit Data',
        UTI: 'public.comma-separated-values-text',
      });
    }

    return filePath;
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
}

/**
 * Legacy function name for backward compatibility
 * Now exports as CSV instead of ZIP
 * @param userId - User ID to export data for
 * @param filters - Optional date filters (month/year or date range)
 */
export async function exportZip(userId?: string, filters?: ExportFilters) {
  return exportCSV(userId, filters);
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let i = 0, field = '', inQuotes = false; const cur: string[] = [];
  while (i < text.length) {
    const ch = text[i++];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { cur.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i] === '\n') i++;
        if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push([...cur]); cur.length = 0; field=''; }
      } else field += ch;
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  return rows;
}

/**
 * Import assessments from CSV file
 * @param userId - User ID to assign imported assessments to
 */
export async function importCSV(userId: string) {
  try {
    // Pick CSV file
    const pick = await DocumentPicker.getDocumentAsync({ 
      type: 'text/csv',
      copyToCacheDirectory: true,
    });
    
    if (pick.canceled || !pick.assets?.length) {
      return { success: false, message: 'No file selected' };
    }

    const uri = pick.assets[0].uri;

    // Read CSV file
    const csvText = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Parse CSV
    const rows = parseCsv(csvText);
    if (rows.length < 2) {
      throw new Error('CSV file is empty or has no data rows');
    }

    const [header, ...dataRows] = rows;
    
    // Find column indices
    const idx = (name: string) => {
      const index = header.findIndex(h => 
        h.toLowerCase().replace(/[^a-z0-9]/g, '') === name.toLowerCase().replace(/[^a-z0-9]/g, '')
      );
      return index >= 0 ? index : header.indexOf(name);
    };

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Import each row
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || row.length === 0 || !row.some(cell => cell.trim())) {
        skipped++;
        continue;
      }

      try {
        // Parse timestamp (handle both formatted and numeric)
        let created_at = Date.now();
        const dateStr = row[idx('Date Created')] || row[idx('created_at')];
        if (dateStr) {
          const parsedDate = new Date(dateStr);
          created_at = !isNaN(parsedDate.getTime()) ? parsedDate.getTime() : Number(dateStr) || Date.now();
        }

        // Parse coordinates
        const latStr = row[idx('Latitude')] || row[idx('latitude')];
        const lonStr = row[idx('Longitude')] || row[idx('longitude')];
        const latitude = latStr && latStr.trim() ? Number(latStr) : null;
        const longitude = lonStr && lonStr.trim() ? Number(lonStr) : null;

        // Get required fields
        const category = row[idx('Category')] || row[idx('category')] || '';
        const element = row[idx('Element')] || row[idx('element')] || '';
        const condition = Number(row[idx('Condition')] || row[idx('condition')] || 1);
        const priority = Number(row[idx('Priority')] || row[idx('priority')] || 1);
        const notes = row[idx('Notes')] || row[idx('notes')] || '';
        const photo_uri = row[idx('Photo URL')] || row[idx('photo_uri')] || '';

        // Validate required fields
        if (!category || !element || !photo_uri) {
          errors.push(`Row ${i + 2}: Missing required fields (category, element, or photo URL)`);
          skipped++;
          continue;
        }

        // Create assessment in Firestore
        await FirestoreService.createAssessment({
          userId,
          category,
          element,
          condition,
          priority,
          notes,
          photo_uri,
          latitude: latitude && !isNaN(latitude) ? latitude : null,
          longitude: longitude && !isNaN(longitude) ? longitude : null,
          created_at,
        });

        imported++;
      } catch (error) {
        console.error(`Error importing row ${i + 2}:`, error);
        errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        skipped++;
      }
    }

    return {
      success: true,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${imported} assessment(s). ${skipped > 0 ? `Skipped ${skipped} row(s).` : ''}`,
    };
  } catch (error) {
    console.error('Import error:', error);
    throw error;
  }
}

/**
 * Legacy function name for backward compatibility
 * Now imports from CSV instead of ZIP
 */
export async function importZip(userId?: string) {
  if (!userId) {
    throw new Error('User ID is required for import');
  }
  const result = await importCSV(userId);
  return result.success;
}

