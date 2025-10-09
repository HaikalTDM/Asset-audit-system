# PDF Report Generation Guide

## Overview
The Asset Audit System now includes professional PDF report generation with the following features:

✅ **Single Assessment Reports** - Detailed PDF for individual assessments  
✅ **Batch Reports** - Export multiple assessments as one PDF  
✅ **Professional Styling** - Clean, corporate-ready design  
✅ **Photo Embedding** - Assessment photos included in PDFs  
✅ **Company Branding** - Customizable company name and colors  
✅ **Share Functionality** - Easy sharing via email, cloud storage, etc.

---

## Features

### 1. Single Assessment PDF
- **Location**: Assessment Details Screen (`history/[id].tsx`)
- **Access**: "Export as PDF" button at bottom of each assessment
- **Includes**:
  - Assessment ID and date
  - Category and element details
  - Condition and priority ratings with color-coded badges
  - Matrix score and grade (A/B/C/D)
  - GPS location (if available)
  - Full-size photo
  - Notes and observations
  - Company branding footer

### 2. Batch Assessment PDF
- **Location**: History Tab & Admin All-Assessments Screen
- **Access**: "Export All as PDF" button at top of list
- **Includes**:
  - Summary statistics (total, avg condition, avg priority)
  - Compact listing of all assessments
  - Individual assessment cards with key details
  - Color-coded badges for quick reference
  - Date generated footer

### 3. Filtered Batch Export (Admin)
- **Location**: Admin All-Assessments Screen
- **Access**: "Export as PDF" button (respects current filters)
- **Features**:
  - Exports only filtered/searched assessments
  - Filename includes user filter (if applied)
  - Search and user filters apply to export

---

## How to Use

### For Staff Users

#### Export Single Assessment:
1. Navigate to **History** tab
2. Tap any assessment to view details
3. Scroll down and tap **"Export as PDF"**
4. Choose how to share (email, save, etc.)

#### Export All Assessments:
1. Navigate to **History** tab
2. Tap **"Export All as PDF"** at top of list
3. Wait for generation (may take a few seconds)
4. Choose how to share the PDF

### For Admin Users

#### Export Filtered Assessments:
1. Navigate to **All Assessments** tab
2. Use search or user filters (optional)
3. Tap **"Export as PDF"** at top
4. The PDF will only include visible/filtered assessments
5. Share the generated PDF

---

## PDF Content Details

### Single Assessment Report Sections:
1. **Header**
   - Company name
   - Report title
   - Assessment ID

2. **Assessment Details**
   - Category & Element
   - Date & Time
   - GPS Coordinates (if available)

3. **Condition & Priority**
   - Condition rating (1-5) with label
   - Priority level (1-5) with label
   - Matrix Score card (gradient design)
   - Overall Grade (A/B/C/D)

4. **Photo**
   - Full embedded assessment photo

5. **Notes**
   - Observations and comments

6. **Footer**
   - Generation date/time
   - Company contact info (if configured)

### Batch Report Sections:
1. **Header** - Company name, date
2. **Summary** - Total count, averages
3. **Assessment Cards** - Compact view of each assessment
4. **Footer** - Generation info

---

## Technical Details

### File Location
- **PDF Generator**: `lib/pdf/pdfGenerator.ts`
- **Integration Points**:
  - `app/(app)/history/[id].tsx` - Single export
  - `app/(app)/(tabs)/history.tsx` - Batch export (staff)
  - `app/(app)/(admin-tabs)/all-assessments.tsx` - Batch export (admin)

### Dependencies
- `expo-print` - PDF generation
- `expo-sharing` - File sharing
- `expo-file-system` - File operations

### Functions
```typescript
// Generate single assessment PDF
generateSingleAssessmentPDF(
  assessmentId: string,
  options?: PDFOptions,
  branding?: CompanyBranding
): Promise<string>

// Generate batch PDF
generateBatchAssessmentPDF(
  assessmentIds: string[],
  options?: PDFOptions,
  branding?: CompanyBranding
): Promise<string>

// Share PDF
sharePDF(pdfUri: string, filename?: string): Promise<void>
```

### Options
```typescript
type PDFOptions = {
  includePhotos?: boolean;   // Default: true
  includeMap?: boolean;       // Default: true (future feature)
  format?: 'A4' | 'Letter';   // Default: 'A4'
  orientation?: 'portrait' | 'landscape'; // Default: 'portrait'
};

type CompanyBranding = {
  companyName: string;        // Default: 'Asset Audit System'
  companyLogo?: string;       // Base64 or URL (future)
  address?: string;
  phone?: string;
  email?: string;
  primaryColor?: string;      // Default: '#3b82f6'
};
```

---

## Customization

### Company Branding
To customize company information in PDFs:

1. Edit branding in `pdfGenerator.ts`:
```typescript
const branding: CompanyBranding = {
  companyName: 'Your Company Name',
  address: '123 Main St, City, State',
  phone: '+1 (555) 123-4567',
  email: 'info@yourcompany.com',
  primaryColor: '#your-brand-color',
};
```

2. Pass branding to generation functions:
```typescript
await generateSingleAssessmentPDF(id, { includePhotos: true }, branding);
```

### Styling
PDF styles are in HTML/CSS format within `pdfGenerator.ts`:
- Edit colors in `<style>` tags
- Modify layout sections
- Customize badges, cards, and formatting

---

## Performance Notes

- **Single PDF**: ~2-3 seconds (includes photo download)
- **Batch PDF (10 assessments)**: ~5-10 seconds
- **Large batches**: Photos excluded by default to reduce file size
- **Photo embedding**: Uses base64 encoding (increases file size)

---

## Troubleshooting

### "Failed to generate PDF"
- Check internet connection (for fetching photos)
- Ensure assessment data is complete
- Try again after a moment

### PDF doesn't include photo
- Photo might have failed to load
- Check Firebase Storage permissions
- Ensure photo URI is valid

### Sharing not available
- On some devices, sharing might be limited
- Try using "Save to Files" instead
- Check app permissions

---

## Future Enhancements
- [ ] Static map generation (GPS location)
- [ ] Company logo support
- [ ] Custom PDF templates
- [ ] Scheduled/automated reports
- [ ] Email delivery integration
- [ ] Multi-language support

---

## Summary

The PDF generation feature provides a professional way to export and share assessment data:

✅ **Single & Batch** exports  
✅ **Professional** design  
✅ **Easy sharing** built-in  
✅ **Customizable** branding  
✅ **Fast** generation

Perfect for creating reports for clients, stakeholders, or archival purposes!

