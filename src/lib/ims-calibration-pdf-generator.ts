'use client';

import { PDFReportBuilder, type LogoData } from './pdf-builder';

const COMPANY = 'Hexa Steel®';
const TAGLINE = 'Integrated Management System — ISO 9001:2015 / ISO 14001:2015 / ISO 45001:2018';
const FOOTER = 'Hexa Steel® OTS · Confidential IMS Document · hexasteel.sa/ots';

async function loadLogoForPDF(): Promise<LogoData | undefined> {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return undefined;
    const data = await res.json();
    const whitePath: string | undefined = data.logoWhite;
    const colorPath: string | undefined = data.companyLogo;
    const logoPath = whitePath || colorPath;
    if (!logoPath) return undefined;
    const isWhite = !!whitePath;

    const imgRes = await fetch(logoPath);
    if (!imgRes.ok) return undefined;
    const blob = await imgRes.blob();
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

    const aspectRatio = await new Promise<number>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth / img.naturalHeight || 1);
      img.onerror = () => resolve(1);
      img.src = base64;
    });

    return { base64, aspectRatio, isWhite };
  } catch {
    return undefined;
  }
}

export type CalibrationRecordPDFData = {
  assetCode: string;
  assetName: string;
  make?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  location?: string | null;
  calibrationFrequency?: string | null;
  lastCalibratedAt?: string | null;
  calibrationDueAt?: string | null;
  calibrationCertRef?: string | null;
  calibrationBody?: string | null;
  calibrationStatus?: string | null;
  calibrationResult?: string;
  remarks?: string;
};

function fmt(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-SA-u-ca-gregory', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
}

export async function generateCalibrationRecordPDF(data: CalibrationRecordPDFData): Promise<Blob> {
  const logo = await loadLogoForPDF();
  const pdf = new PDFReportBuilder('portrait', 'steel');

  pdf.addHeader(COMPANY, TAGLINE, logo);
  
  pdf.addTitle(
    'Calibration Certificate',
    'HEXA-FRM-022 · Procedure: Hexa-ISP-015 · ISO 9001:2015 §7.1.5'
  );

  pdf.addMetadataBox({
    'Asset Code': data.assetCode,
    'Cert. Ref': data.calibrationCertRef || '—',
    'Date': fmt(data.lastCalibratedAt),
    'Status': data.calibrationStatus || 'PASS',
  });

  pdf.addSectionHeader('Equipment Information');
  pdf.addInfoGrid({
    'Equipment Name': data.assetName,
    'Manufacturer': data.make || '—',
    'Model': data.model || '—',
    'Serial Number': data.serialNumber || '—',
    'Location': data.location || '—',
    'Calibration Frequency': data.calibrationFrequency || '—',
  }, 2);

  pdf.addSectionHeader('Calibration Details');
  pdf.addInfoGrid({
    'Last Calibrated': fmt(data.lastCalibratedAt),
    'Next Due Date': fmt(data.calibrationDueAt),
    'Calibration Body': data.calibrationBody || '—',
    'Certificate Reference': data.calibrationCertRef || '—',
    'Calibration Result': data.calibrationStatus || 'PASS',
  }, 2);

  if (data.remarks) {
    pdf.addSectionHeader('Remarks');
    pdf.addParagraph(data.remarks);
  }

  pdf.addSectionHeader('Calibration Standards & Traceability');
  pdf.addParagraph(
    'This calibration was performed in accordance with ISO/IEC 17025 standards. ' +
    'All measurements are traceable to national/international standards through an unbroken chain of calibrations. ' +
    'The calibration body is accredited by the Saudi Standards, Metrology and Quality Organization (SASO) or equivalent international accreditation body.'
  );

  pdf.addSignatureSection([
    { label: 'Calibrated By', name: data.calibrationBody || undefined },
    { label: 'Verified By', name: 'QC Manager' },
    { label: 'Approved By', name: 'IMS Representative' },
  ]);

  pdf.addFooter(FOOTER, 'HEXA-FRM-022 · Hexa-ISP-015 · ISO §7.1.5');

  return pdf.getBlob();
}
