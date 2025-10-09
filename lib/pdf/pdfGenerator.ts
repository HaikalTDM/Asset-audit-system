import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Assessment, FirestoreService } from '../firestore';

/**
 * PDF Generator Service
 * Generates professional PDF reports for assessments
 */

export type PDFOptions = {
  includePhotos?: boolean;
  includeMap?: boolean;
  format?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
};

export type CompanyBranding = {
  companyName: string;
  companyLogo?: string; // Base64 or URL
  address?: string;
  phone?: string;
  email?: string;
  primaryColor?: string;
};

/**
 * Generate PDF for single assessment
 */
export async function generateSingleAssessmentPDF(
  assessmentId: string,
  options: PDFOptions = {},
  branding?: CompanyBranding
): Promise<string> {
  try {
    console.log('Generating PDF for assessment:', assessmentId);

    // Get assessment data
    const assessment = await FirestoreService.getAssessment(assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    // Generate HTML content
    const html = await generateSingleAssessmentHTML(assessment, options, branding);

    // Create PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    console.log('PDF generated:', uri);
    return uri;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF report');
  }
}

/**
 * Generate PDF for multiple assessments
 */
export async function generateBatchAssessmentPDF(
  assessmentIds: string[],
  options: PDFOptions = {},
  branding?: CompanyBranding
): Promise<string> {
  try {
    console.log('Generating batch PDF for', assessmentIds.length, 'assessments');

    // Get all assessments
    const assessments = await Promise.all(
      assessmentIds.map((id) => FirestoreService.getAssessment(id))
    );

    const validAssessments = assessments.filter((a) => a !== null) as Assessment[];

    if (validAssessments.length === 0) {
      throw new Error('No valid assessments found');
    }

    // Generate HTML content
    const html = await generateBatchAssessmentHTML(validAssessments, options, branding);

    // Create PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    console.log('Batch PDF generated:', uri);
    return uri;
  } catch (error) {
    console.error('Error generating batch PDF:', error);
    throw new Error('Failed to generate batch PDF report');
  }
}

/**
 * Share PDF file
 */
export async function sharePDF(pdfUri: string, filename?: string): Promise<void> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }

    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Assessment Report',
      UTI: 'com.adobe.pdf',
    });
  } catch (error) {
    console.error('Error sharing PDF:', error);
    throw new Error('Failed to share PDF');
  }
}

/**
 * Save PDF to device
 */
export async function savePDFToDevice(
  pdfUri: string,
  filename: string
): Promise<string> {
  try {
    // On mobile, PDFs are already in a shareable location
    // Just return the URI for sharing
    return pdfUri;
  } catch (error) {
    console.error('Error saving PDF:', error);
    throw new Error('Failed to save PDF');
  }
}

/**
 * Generate HTML for single assessment
 */
async function generateSingleAssessmentHTML(
  assessment: Assessment,
  options: PDFOptions,
  branding?: CompanyBranding
): Promise<string> {
  const {
    includePhotos = true,
    includeMap = true,
  } = options;

  // Get photo as base64 for embedding
  let photoBase64 = '';
  if (includePhotos && assessment.photo_uri) {
    try {
      photoBase64 = await getImageAsBase64(assessment.photo_uri);
    } catch (error) {
      console.warn('Failed to load photo:', error);
    }
  }

  // Calculate scores
  const matrixScore = assessment.condition * assessment.priority;
  const grade = getGrade(matrixScore);

  const companyName = branding?.companyName || 'Asset Audit System';
  const primaryColor = branding?.primaryColor || '#3b82f6';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Assessment Report - ${assessment.id}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #1f2937;
      padding: 20px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid ${primaryColor};
    }
    
    .company-name {
      font-size: 24px;
      font-weight: 700;
      color: ${primaryColor};
      margin-bottom: 5px;
    }
    
    .report-title {
      font-size: 18px;
      font-weight: 600;
      color: #4b5563;
      margin-top: 10px;
    }
    
    .assessment-id {
      font-size: 14px;
      color: #6b7280;
      margin-top: 5px;
    }
    
    .section {
      margin-bottom: 25px;
    }
    
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: ${primaryColor};
      margin-bottom: 12px;
      padding-bottom: 5px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 15px;
    }
    
    .info-item {
      display: flex;
      flex-direction: column;
    }
    
    .info-label {
      font-size: 10px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    
    .info-value {
      font-size: 13px;
      font-weight: 600;
      color: #1f2937;
    }
    
    .score-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      margin: 20px 0;
    }
    
    .score-number {
      font-size: 48px;
      font-weight: 700;
      margin-bottom: 5px;
    }
    
    .score-label {
      font-size: 16px;
      font-weight: 600;
      opacity: 0.9;
    }
    
    .score-grade {
      font-size: 14px;
      margin-top: 10px;
      opacity: 0.8;
    }
    
    .photo-container {
      margin: 20px 0;
      text-align: center;
    }
    
    .photo {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .notes-box {
      background: #f9fafb;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid ${primaryColor};
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 10px;
      color: #9ca3af;
    }
    
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      margin-top: 5px;
    }
    
    .badge-excellent { background: #10b981; color: white; }
    .badge-good { background: #3b82f6; color: white; }
    .badge-fair { background: #f59e0b; color: white; }
    .badge-poor { background: #ef4444; color: white; }
    
    @media print {
      body { padding: 10px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">${companyName}</div>
    <div class="report-title">Asset Assessment Report</div>
    <div class="assessment-id">ID: ${assessment.id}</div>
  </div>

  <div class="section">
    <div class="section-title">Assessment Details</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Category</div>
        <div class="info-value">${assessment.category}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Element</div>
        <div class="info-value">${assessment.element}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Date</div>
        <div class="info-value">${new Date(assessment.created_at).toLocaleString()}</div>
      </div>
      ${
        assessment.latitude && assessment.longitude
          ? `
      <div class="info-item">
        <div class="info-label">GPS Location</div>
        <div class="info-value">${assessment.latitude.toFixed(6)}, ${assessment.longitude.toFixed(6)}</div>
      </div>
      `
          : ''
      }
    </div>
  </div>

  <div class="section">
    <div class="section-title">Condition & Priority</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Condition Rating</div>
        <div class="info-value">
          ${assessment.condition}/5
          <span class="badge ${getConditionBadgeClass(assessment.condition)}">
            ${getConditionLabel(assessment.condition)}
          </span>
        </div>
      </div>
      <div class="info-item">
        <div class="info-label">Priority Level</div>
        <div class="info-value">
          ${assessment.priority}/5
          <span class="badge ${getPriorityBadgeClass(assessment.priority)}">
            ${getPriorityLabel(assessment.priority)}
          </span>
        </div>
      </div>
    </div>
    
    <div class="score-card">
      <div class="score-number">${matrixScore}</div>
      <div class="score-label">Matrix Score</div>
      <div class="score-grade">Grade: ${grade.grade} - ${grade.label}</div>
    </div>
  </div>

  ${
    includePhotos && photoBase64
      ? `
  <div class="section">
    <div class="section-title">Photo</div>
    <div class="photo-container">
      <img src="data:image/jpeg;base64,${photoBase64}" class="photo" alt="Assessment Photo" />
    </div>
  </div>
  `
      : ''
  }

  ${
    assessment.notes
      ? `
  <div class="section">
    <div class="section-title">Notes & Observations</div>
    <div class="notes-box">
      ${assessment.notes}
    </div>
  </div>
  `
      : ''
  }

  <div class="footer">
    Generated on ${new Date().toLocaleString()} | ${companyName}
    ${branding?.address ? `<br>${branding.address}` : ''}
    ${branding?.phone ? ` | ${branding.phone}` : ''}
    ${branding?.email ? ` | ${branding.email}` : ''}
  </div>
</body>
</html>
  `;
}

/**
 * Generate HTML for batch assessments
 */
async function generateBatchAssessmentHTML(
  assessments: Assessment[],
  options: PDFOptions,
  branding?: CompanyBranding
): Promise<string> {
  const companyName = branding?.companyName || 'Asset Audit System';
  const primaryColor = branding?.primaryColor || '#3b82f6';

  // Generate individual assessment sections
  const assessmentSections = await Promise.all(
    assessments.map((assessment, index) =>
      generateAssessmentSection(assessment, index + 1, options, primaryColor)
    )
  );

  // Calculate summary statistics
  const totalAssessments = assessments.length;
  const avgCondition = (
    assessments.reduce((sum, a) => sum + a.condition, 0) / totalAssessments
  ).toFixed(1);
  const avgPriority = (
    assessments.reduce((sum, a) => sum + a.priority, 0) / totalAssessments
  ).toFixed(1);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Batch Assessment Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: #1f2937;
      padding: 15px;
    }
    .header {
      text-align: center;
      margin-bottom: 25px;
      padding-bottom: 15px;
      border-bottom: 3px solid ${primaryColor};
    }
    .company-name {
      font-size: 22px;
      font-weight: 700;
      color: ${primaryColor};
    }
    .report-title {
      font-size: 16px;
      font-weight: 600;
      color: #4b5563;
      margin-top: 8px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin: 20px 0;
    }
    .summary-card {
      background: #f3f4f6;
      padding: 12px;
      border-radius: 8px;
      text-align: center;
    }
    .summary-number {
      font-size: 24px;
      font-weight: 700;
      color: ${primaryColor};
    }
    .summary-label {
      font-size: 10px;
      color: #6b7280;
      margin-top: 4px;
    }
    .assessment-item {
      margin: 20px 0;
      padding: 15px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      page-break-inside: avoid;
    }
    .assessment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }
    .assessment-number {
      font-size: 14px;
      font-weight: 700;
      color: ${primaryColor};
    }
    .assessment-id {
      font-size: 10px;
      color: #6b7280;
    }
    .info-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 8px;
    }
    .info-item {
      font-size: 10px;
    }
    .info-label {
      color: #6b7280;
      font-weight: 600;
    }
    .info-value {
      color: #1f2937;
      font-weight: 600;
      margin-top: 2px;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 9px;
      font-weight: 600;
      margin-left: 5px;
    }
    .badge-excellent { background: #10b981; color: white; }
    .badge-good { background: #3b82f6; color: white; }
    .badge-fair { background: #f59e0b; color: white; }
    .badge-poor { background: #ef4444; color: white; }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 9px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">${companyName}</div>
    <div class="report-title">Batch Assessment Report</div>
    <div style="font-size: 11px; color: #6b7280; margin-top: 5px;">
      ${totalAssessments} Assessment${totalAssessments > 1 ? 's' : ''} | Generated ${new Date().toLocaleDateString()}
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-number">${totalAssessments}</div>
      <div class="summary-label">Total Assessments</div>
    </div>
    <div class="summary-card">
      <div class="summary-number">${avgCondition}</div>
      <div class="summary-label">Avg Condition</div>
    </div>
    <div class="summary-card">
      <div class="summary-number">${avgPriority}</div>
      <div class="summary-label">Avg Priority</div>
    </div>
  </div>

  ${assessmentSections.join('\n')}

  <div class="footer">
    Generated on ${new Date().toLocaleString()} | ${companyName}
  </div>
</body>
</html>
  `;
}

/**
 * Generate individual assessment section for batch report
 */
async function generateAssessmentSection(
  assessment: Assessment,
  number: number,
  options: PDFOptions,
  primaryColor: string
): Promise<string> {
  const matrixScore = assessment.condition * assessment.priority;
  const grade = getGrade(matrixScore);

  return `
  <div class="assessment-item">
    <div class="assessment-header">
      <div class="assessment-number">Assessment #${number}</div>
      <div class="assessment-id">${assessment.id}</div>
    </div>
    <div class="info-row">
      <div class="info-item">
        <div class="info-label">Category</div>
        <div class="info-value">${assessment.category}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Element</div>
        <div class="info-value">${assessment.element}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Condition</div>
        <div class="info-value">
          ${assessment.condition}/5
          <span class="badge ${getConditionBadgeClass(assessment.condition)}">
            ${getConditionLabel(assessment.condition)}
          </span>
        </div>
      </div>
      <div class="info-item">
        <div class="info-label">Priority</div>
        <div class="info-value">
          ${assessment.priority}/5
          <span class="badge ${getPriorityBadgeClass(assessment.priority)}">
            ${getPriorityLabel(assessment.priority)}
          </span>
        </div>
      </div>
    </div>
    <div class="info-row">
      <div class="info-item">
        <div class="info-label">Score</div>
        <div class="info-value">${matrixScore} (${grade.grade})</div>
      </div>
      <div class="info-item">
        <div class="info-label">Date</div>
        <div class="info-value">${new Date(assessment.created_at).toLocaleDateString()}</div>
      </div>
      ${
        assessment.latitude && assessment.longitude
          ? `
      <div class="info-item" style="grid-column: span 2;">
        <div class="info-label">GPS</div>
        <div class="info-value">${assessment.latitude.toFixed(4)}, ${assessment.longitude.toFixed(4)}</div>
      </div>
      `
          : ''
      }
    </div>
    ${
      assessment.notes
        ? `
    <div style="margin-top: 8px; padding: 8px; background: #f9fafb; border-radius: 4px; font-size: 10px;">
      <strong>Notes:</strong> ${assessment.notes}
    </div>
    `
        : ''
    }
  </div>
  `;
}

/**
 * Helper: Convert image URL to base64
 */
async function getImageAsBase64(imageUri: string): Promise<string> {
  try {
    // Download image to cache
    const downloadResult = await FileSystem.downloadAsync(
      imageUri,
      FileSystem.cacheDirectory + 'temp_pdf_image.jpg'
    );

    // Read as base64
    const base64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return base64;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
}

/**
 * Helper: Get grade from matrix score
 */
function getGrade(total: number): { grade: string; label: string } {
  if (total <= 5) return { grade: 'A', label: 'Very Good' };
  if (total <= 10) return { grade: 'B', label: 'Good' };
  if (total <= 15) return { grade: 'C', label: 'Fair' };
  return { grade: 'D', label: 'Poor' };
}

/**
 * Helper: Get condition label
 */
function getConditionLabel(condition: number): string {
  const labels = ['', 'Excellent', 'Good', 'Fair', 'Poor', 'Critical'];
  return labels[condition] || 'Unknown';
}

/**
 * Helper: Get priority label
 */
function getPriorityLabel(priority: number): string {
  const labels = ['', 'Very High', 'High', 'Medium', 'Low', 'Very Low'];
  return labels[priority] || 'Unknown';
}

/**
 * Helper: Get condition badge class
 */
function getConditionBadgeClass(condition: number): string {
  if (condition <= 2) return 'badge-excellent';
  if (condition === 3) return 'badge-good';
  if (condition === 4) return 'badge-fair';
  return 'badge-poor';
}

/**
 * Helper: Get priority badge class
 */
function getPriorityBadgeClass(priority: number): string {
  if (priority <= 2) return 'badge-excellent';
  if (priority === 3) return 'badge-good';
  if (priority === 4) return 'badge-fair';
  return 'badge-poor';
}

