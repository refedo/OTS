# Settings Module

Complete system settings management with company branding and report customization.

## Features

### 🏢 Company Information
- **Company Name**: Displayed on all reports
- **Tagline**: Appears under company name
- **Logo Upload**: PNG/SVG logo with preview
- **Address**: Full company address
- **Contact Details**: Phone, email, website

### 📄 Report Settings
- **Default Theme**: Choose from 5 professional themes
- **Footer Text**: Customizable footer for all reports
- **Logo Integration**: Automatically added to all PDF reports

### 🌐 System Configuration
- **Date Format**: DD-MM-YYYY, MM-DD-YYYY, YYYY-MM-DD
- **Timezone**: Default UTC+03:00
- **Currency**: SAR, USD, EUR, etc.

### 🔔 Notifications
- **Email Notifications**: Enable/disable system emails
- **SMS Notifications**: Enable/disable SMS alerts

## Database Schema

```prisma
model SystemSettings {
  id                String   @id @default(uuid())
  
  // Company Information
  companyName       String   @default("HEXA STEEL")
  companyTagline    String   @default("THRIVE DIFFERENT")
  companyLogo       String?  // Path to logo file
  companyAddress    String?
  companyPhone      String?
  companyEmail      String?
  companyWebsite    String?
  
  // Report Settings
  defaultReportTheme String  @default("blue")
  reportFooterText   String  @default("HEXA STEEL - Professional Report")
  
  // System Settings
  dateFormat        String   @default("DD-MM-YYYY")
  timezone          String   @default("UTC+03:00")
  currency          String   @default("SAR")
  
  // Notification Settings
  emailNotifications Boolean @default(true)
  smsNotifications   Boolean @default(false)
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

## API Endpoints

### GET /api/settings
Fetch current system settings.

**Response:**
```json
{
  "id": "uuid",
  "companyName": "HEXA STEEL",
  "companyTagline": "THRIVE DIFFERENT",
  "companyLogo": "/uploads/company-logo/logo.png",
  "defaultReportTheme": "blue",
  "reportFooterText": "HEXA STEEL - Professional Report",
  ...
}
```

### PATCH /api/settings
Update system settings (Admin only).

**Request Body:**
```json
{
  "companyName": "New Company Name",
  "companyLogo": "/uploads/company-logo/new-logo.png",
  "defaultReportTheme": "green"
}
```

## Usage

### Accessing Settings Page

Navigate to `/settings` or click **Settings** in the sidebar.

**Permissions:** Admin only for editing

### Uploading Logo

1. Go to Settings → Company tab
2. Click "Choose File" under Company Logo
3. Select PNG or SVG file (max 2MB)
4. Logo preview appears immediately
5. Click "Save Changes" to apply

**Recommended Logo Specs:**
- Format: PNG or SVG
- Size: 200x200px to 400x400px
- Background: Transparent
- File size: < 2MB

### Changing Report Theme

1. Go to Settings → Reports tab
2. Select theme from dropdown
3. Preview colors in dropdown
4. Save changes

### Using Settings in Reports

Settings are automatically fetched and applied when exporting PDFs:

```typescript
// In export button component
const settingsResponse = await fetch('/api/settings');
const settings = await settingsResponse.json();

// Convert logo to base64
const logoBase64 = await imageToBase64(settings.companyLogo);

// Generate PDF with settings
const blob = generateWPSPDF(wps, theme, settings, logoBase64);
```

## Logo Integration

### How It Works

1. **Upload**: Logo uploaded to `/public/uploads/company-logo/`
2. **Storage**: Path saved in database
3. **Fetch**: Settings API returns logo path
4. **Convert**: Client converts image to base64
5. **Embed**: Base64 image embedded in PDF

### Base64 Conversion

```typescript
const imageToBase64 = async (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
};
```

## Extending to Other Reports

To add settings to a new report type:

1. **Update Generator Function**:
```typescript
export function generateMyReportPDF(
  data: MyData,
  themeName: 'blue' | 'green' | 'orange' | 'purple' | 'red' = 'blue',
  settings?: any,
  logoBase64?: string
): Blob {
  const pdf = new PDFReportBuilder('portrait', themeName);
  
  // Use settings
  pdf.addHeader(
    settings?.companyName || 'HEXA STEEL',
    settings?.companyTagline || 'THRIVE DIFFERENT',
    logoBase64
  );
  
  // ... rest of report
  
  pdf.addFooter(settings?.reportFooterText || 'Default Footer');
  
  return pdf.getBlob();
}
```

2. **Update Export Component**:
```typescript
const handleExport = async () => {
  // Fetch settings
  const settingsResponse = await fetch('/api/settings');
  const settings = await settingsResponse.json();
  
  // Convert logo
  let logoBase64: string | undefined;
  if (settings?.companyLogo) {
    logoBase64 = await imageToBase64(settings.companyLogo);
  }
  
  // Generate with settings
  const blob = generateMyReportPDF(data, theme, settings, logoBase64);
  // ... download
};
```

## Seeding Default Settings

Run the seed script to initialize default settings:

```bash
npx ts-node prisma/seeds/system-settings-seed.ts
```

Or include in main seed file:

```typescript
import { seedSystemSettings } from './seeds/system-settings-seed';

async function main() {
  await seedSystemSettings();
  // ... other seeds
}
```

## Security

- **Admin Only**: Only users with Admin role can modify settings
- **File Upload**: Logo upload uses secure `/api/upload` endpoint
- **Validation**: Zod schema validates all inputs
- **File Types**: Only images allowed for logo
- **File Size**: 10MB limit enforced

## Future Enhancements

- [ ] Multiple logo variants (light/dark mode)
- [ ] Custom color themes
- [ ] Email template customization
- [ ] Multi-language support
- [ ] Backup/restore settings
- [ ] Settings history/audit log
- [ ] Company seal/stamp upload
- [ ] Digital signature integration

## Troubleshooting

### Logo Not Appearing in PDF

1. Check logo path in settings
2. Verify file exists in `/public/uploads/company-logo/`
3. Check browser console for CORS errors
4. Ensure image format is PNG or JPEG
5. Try re-uploading logo

### Settings Not Saving

1. Verify user has Admin role
2. Check API response in Network tab
3. Validate input format (email, URL)
4. Check server logs for errors

### Theme Not Applied

1. Ensure theme is saved in settings
2. Clear browser cache
3. Check export component fetches settings
4. Verify theme name matches available themes

## Best Practices

1. **Logo Quality**: Use high-resolution logo for best PDF output
2. **Consistent Branding**: Update all settings together
3. **Test Reports**: Generate test PDFs after changing settings
4. **Backup Logo**: Keep original logo file as backup
5. **Regular Updates**: Review settings periodically
6. **Documentation**: Document any custom configurations
