import { PDFReportBuilder } from './pdf-builder';

export type WPSData = {
  wpsNumber: string;
  revision: number;
  dateIssued?: Date | string;
  project: {
    projectNumber: string;
    name: string;
    client: { name: string };
  };
  weldingProcess: string;
  supportingPQR?: string;
  type: string;
  
  // Joint Diagram
  jointDiagram?: string;
  
  // Backing & Type
  backingUsed?: string;
  backingType2?: string;
  
  // Base Metal
  materialSpec?: string;
  materialGroup?: string;
  thicknessRange?: string;
  baseMetalGroove?: string;
  baseMetalFillet?: string;
  materialThickness?: number;
  
  // Filler Metal
  fillerMetalSpec?: string;
  fillerClass?: string;
  shieldingGas?: string;
  flowRate?: number;
  
  // Electrical
  currentType?: string;
  
  // Temperature
  preheatTempMin?: number;
  interpassTempMin?: number;
  interpassTempMax?: number;
  postWeldTemp?: number;
  
  // Technique
  position?: string;
  jointType?: string;
  grooveAngle?: number;
  rootOpening?: number;
  backingType?: string;
  
  // Passes
  passes: Array<{
    layerNo: number;
    process: string;
    electrodeClass?: string;
    diameter?: number;
    polarity?: string;
    amperage?: number;
    voltage?: number;
    travelSpeed?: number;
    heatInput?: number;
  }>;
  
  // Approval
  preparedBy: {
    name: string;
    position?: string;
  };
  approvedBy?: {
    name: string;
    position?: string;
  };
  status: string;
  remarks?: string;
};

export function generateWPSPDF(
  wps: WPSData, 
  themeName: 'blue' | 'green' | 'orange' | 'purple' | 'red' = 'blue',
  settings?: any,
  logoBase64?: string
): Blob {
  const pdf = new PDFReportBuilder('portrait', themeName);

  // Header with settings or defaults
  pdf.addHeader(
    settings?.companyName || 'HEXA STEEL',
    settings?.companyTagline || 'THRIVE DIFFERENT',
    logoBase64
  );

  // Title
  pdf.addTitle(
    'Welding Procedure Specification (WPS) According to AWS D1.1-2020',
    `${wps.project.client.name}`
  );

  // Metadata box
  pdf.addMetadataBox({
    'DATE': wps.dateIssued 
      ? new Date(wps.dateIssued).toLocaleDateString('en-US', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        })
      : new Date().toLocaleDateString('en-US', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        }),
    'Ref.Doc': `HEXA-WPS-REC-WI-001`,
    'SHEET NO.': '1 of 1',
  });

  // Project Information
  pdf.addSectionHeader('PROJECT INFORMATION');
  pdf.addInfoGrid({
    'Project': wps.project.name,
    'WPS NO': `HEXA-ORS-${wps.wpsNumber}`,
    'REV': wps.revision.toString(),
    'Supporting PQR No.': wps.supportingPQR || 'Prequalified AWS D1.1-2020',
  }, 2);

  // Welding Process
  pdf.addSectionHeader('WELDING PROCESS');
  pdf.addInfoGrid({
    'Process': wps.weldingProcess,
    'Type': wps.type,
  }, 2);

  // Joint Diagram
  if (wps.jointDiagram) {
    pdf.addSectionHeader('JOINTS');
    // Note: In real implementation, you'd need to convert the image URL to base64
    // For now, we'll add a placeholder
    pdf.addParagraph('Joint diagram: See attached drawing', 8);
  }

  // Backing & Type
  if (wps.backingUsed || wps.backingType2) {
    pdf.addInfoGrid({
      ...(wps.backingUsed && { 'Backing': wps.backingUsed }),
      ...(wps.backingType2 && { 'Type': wps.backingType2 }),
    }, 2);
  }

  // Base Metal
  pdf.addSectionHeader('BASE METAL');
  const baseMetalData: Record<string, string> = {};
  if (wps.materialSpec) baseMetalData['Material Spec'] = wps.materialSpec;
  if (wps.materialGroup) baseMetalData['Material Group'] = wps.materialGroup;
  if (wps.thicknessRange) baseMetalData['Thick. Range (mm)'] = wps.thicknessRange;
  if (wps.baseMetalGroove) baseMetalData['Base Metal : Groove'] = wps.baseMetalGroove;
  if (wps.baseMetalFillet) baseMetalData['Fillet'] = wps.baseMetalFillet;
  if (wps.materialThickness) baseMetalData['Material Thick (mm)'] = `${wps.materialThickness} mm`;
  
  if (Object.keys(baseMetalData).length > 0) {
    pdf.addInfoGrid(baseMetalData, 2);
  }

  // Filler Metal
  pdf.addSectionHeader('FILLER METAL');
  const fillerData: Record<string, string> = {};
  if (wps.fillerMetalSpec) fillerData['Filler Metal Spec'] = wps.fillerMetalSpec;
  if (wps.fillerClass) fillerData['Filler Class'] = wps.fillerClass;
  if (wps.shieldingGas) fillerData['Shielding Gas'] = wps.shieldingGas;
  if (wps.flowRate) fillerData['Flow Rate'] = `${wps.flowRate} L/min`;
  
  if (Object.keys(fillerData).length > 0) {
    pdf.addInfoGrid(fillerData, 2);
  }

  // Position
  if (wps.position) {
    pdf.addSectionHeader('POSITION');
    pdf.addInfoGrid({
      'Welding Position': wps.position,
      ...(wps.jointType && { 'Joint Type': wps.jointType }),
    }, 2);
  }

  // Electrical Characteristics
  pdf.addSectionHeader('ELECTRICAL CHARACTERISTICS');
  const electricalData: Record<string, string> = {};
  if (wps.currentType) electricalData['Current Type'] = wps.currentType;
  
  if (Object.keys(electricalData).length > 0) {
    pdf.addInfoGrid(electricalData, 2);
  }

  // Preheat
  pdf.addSectionHeader('PREHEAT');
  const preheatData: Record<string, string> = {};
  if (wps.preheatTempMin) preheatData['Min. Preheat Temp'] = `${wps.preheatTempMin}°C`;
  if (wps.interpassTempMin) preheatData['Min. Interpass Temp'] = `${wps.interpassTempMin}°C`;
  if (wps.interpassTempMax) preheatData['Max. Interpass Temp'] = `${wps.interpassTempMax}°C`;
  
  if (Object.keys(preheatData).length > 0) {
    pdf.addInfoGrid(preheatData, 2);
  }

  // Post-weld Heat Treatment
  if (wps.postWeldTemp) {
    pdf.addSectionHeader('POSTWELD HEAT TREATMENT');
    pdf.addInfoGrid({
      'Temperature': `${wps.postWeldTemp}°C`,
    }, 2);
  }

  // Technique
  pdf.addSectionHeader('TECHNIQUE');
  const techniqueData: Record<string, string> = {};
  if (wps.grooveAngle) techniqueData['Groove Angle'] = `${wps.grooveAngle}°`;
  if (wps.rootOpening) techniqueData['Root Opening'] = `${wps.rootOpening} mm`;
  if (wps.backingType) techniqueData['Backing Type'] = wps.backingType;
  
  if (Object.keys(techniqueData).length > 0) {
    pdf.addInfoGrid(techniqueData, 2);
  }

  // Welding Passes
  if (wps.passes && wps.passes.length > 0) {
    pdf.addSectionHeader('WELDING PASSES');
    
    const headers = [
      'Layer',
      'Process',
      'Electrode',
      'Dia. (mm)',
      'Polarity',
      'Amps',
      'Volts',
      'Travel (mm/min)',
      'Heat (kJ/mm)',
    ];
    
    const rows = wps.passes.map(pass => [
      pass.layerNo.toString(),
      pass.process,
      pass.electrodeClass || '-',
      pass.diameter ? pass.diameter.toString() : '-',
      pass.polarity || '-',
      pass.amperage ? pass.amperage.toString() : '-',
      pass.voltage ? pass.voltage.toString() : '-',
      pass.travelSpeed ? pass.travelSpeed.toString() : '-',
      pass.heatInput ? pass.heatInput.toString() : '-',
    ]);
    
    pdf.addTable(headers, rows, { alternateRows: true });
  }

  // Remarks
  if (wps.remarks) {
    pdf.addSectionHeader('REMARKS');
    pdf.addParagraph(wps.remarks);
  }

  // Signatures
  pdf.addSignatureSection([
    {
      label: 'Prepared BY QC Inspector',
      name: wps.preparedBy.name,
      date: wps.dateIssued 
        ? new Date(wps.dateIssued).toLocaleDateString()
        : new Date().toLocaleDateString(),
    },
    {
      label: 'Checked BY Welding Engineer',
      name: wps.approvedBy?.name || '',
      date: wps.status === 'Approved' && wps.dateIssued
        ? new Date(wps.dateIssued).toLocaleDateString()
        : '',
    },
  ]);

  // Footer with settings or default
  pdf.addFooter(settings?.reportFooterText || 'HEXA STEEL - Welding Procedure Specification');

  return pdf.getBlob();
}
