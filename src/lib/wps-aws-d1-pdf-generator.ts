import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
  baseMaterial?: string;
  thicknessGroove?: number;
  thicknessFillet?: number;
  diameter?: number;
  
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
  clientApprovedBy?: string;
  status: string;
  remarks?: string;
};

export function generateAWSWPSPDF(
  wps: WPSData,
  settings?: any,
  logoBase64?: string
): Blob {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  let yPos = margin;

  // Helper function to draw a cell
  const drawCell = (x: number, y: number, width: number, height: number, text: string, options: any = {}) => {
    const {
      align = 'left',
      fontSize = 8,
      bold = false,
      border = true,
      fill = false,
      fillColor = [255, 255, 255],
      textColor = [0, 0, 0],
      verticalAlign = 'middle',
      padding = 1,
    } = options;

    // Draw border
    if (border) {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.rect(x, y, width, height);
    }

    // Fill background
    if (fill) {
      doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
      doc.rect(x, y, width, height, 'F');
      if (border) {
        doc.rect(x, y, width, height);
      }
    }

    // Set text properties
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    // Calculate text position
    const textLines = doc.splitTextToSize(text, width - (padding * 2));
    const textHeight = textLines.length * fontSize * 0.35;
    
    let textY = y + padding;
    if (verticalAlign === 'middle') {
      textY = y + (height / 2) + (fontSize * 0.35 / 2);
    } else if (verticalAlign === 'bottom') {
      textY = y + height - padding;
    }

    // Draw text
    if (align === 'center') {
      doc.text(textLines, x + width / 2, textY, { align: 'center' });
    } else if (align === 'right') {
      doc.text(textLines, x + width - padding, textY, { align: 'right' });
    } else {
      doc.text(textLines, x + padding, textY);
    }
  };

  // HEADER SECTION
  const headerHeight = 25;
  
  // Main border
  doc.setLineWidth(0.5);
  doc.rect(margin, yPos, pageWidth - (margin * 2), pageHeight - (margin * 2));

  // Header box
  drawCell(margin, yPos, pageWidth - (margin * 2), headerHeight, '', { border: true });

  // Logo area (left)
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', margin + 2, yPos + 2, 30, 20);
    } catch (e) {
      console.error('Error adding logo:', e);
    }
  } else {
    drawCell(margin + 2, yPos + 3, 30, 18, settings?.companyName || 'HEXA STEEL', {
      fontSize: 12,
      bold: true,
      border: false,
      align: 'center',
      verticalAlign: 'middle',
    });
  }

  // Title (center)
  drawCell(margin + 35, yPos + 2, 100, 8, 'Welding Procedure Specification (WPS) According to AWS D1.1-', {
    fontSize: 9,
    bold: true,
    border: false,
    align: 'center',
  });
  drawCell(margin + 35, yPos + 10, 100, 8, '2020', {
    fontSize: 9,
    bold: true,
    border: false,
    align: 'center',
  });
  drawCell(margin + 35, yPos + 18, 100, 5, settings?.companyName || 'HEXA STEEL Company', {
    fontSize: 10,
    bold: true,
    border: false,
    align: 'center',
  });

  // Date box (right)
  const dateBoxX = pageWidth - margin - 45;
  drawCell(dateBoxX, yPos + 2, 45, 6, `DATE: ${wps.dateIssued ? new Date(wps.dateIssued).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ' - ') : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ' - ')}`, {
    fontSize: 8,
    bold: true,
    align: 'center',
  });
  drawCell(dateBoxX, yPos + 8, 45, 6, 'Ref.Doc:', { fontSize: 7, bold: true, align: 'center' });
  drawCell(dateBoxX, yPos + 14, 45, 5, `HEXA-WPS-REC-WI-001`, { fontSize: 7, align: 'center' });
  drawCell(dateBoxX, yPos + 19, 45, 6, 'SHEET NO. :1 of 1', { fontSize: 7, bold: true, align: 'center' });

  yPos += headerHeight + 1;

  // PROJECT LINE
  const projectLineHeight = 6;
  drawCell(margin, yPos, 50, projectLineHeight, `Project: ${wps.project.name}`, { fontSize: 8, bold: true });
  drawCell(margin + 50, yPos, pageWidth - (margin * 2) - 50, projectLineHeight, '', { border: true });
  yPos += projectLineHeight;

  // WPS INFO LINE
  const wpsInfoHeight = 5;
  drawCell(margin, yPos, 35, wpsInfoHeight, `WPS No:HEXA-QRS-${wps.wpsNumber}`, { fontSize: 7 });
  drawCell(margin + 35, yPos, 15, wpsInfoHeight, `REV. ${wps.revision}`, { fontSize: 7, align: 'center' });
  drawCell(margin + 50, yPos, 70, wpsInfoHeight, `Supporting PQR No. : ${wps.supportingPQR || 'Prequalified AWS D1.1-2020'}`, { fontSize: 7 });
  drawCell(margin + 120, yPos, 30, wpsInfoHeight, `TYPE:`, { fontSize: 7 });
  drawCell(margin + 150, yPos, pageWidth - (margin * 2) - 150, wpsInfoHeight, wps.type === 'CUSTOM' ? 'semi-automatic' : 'automatic', { fontSize: 7 });
  yPos += wpsInfoHeight;

  // WELDING PROCESSES LINE
  drawCell(margin, yPos, 35, wpsInfoHeight, `Welding Processes :`, { fontSize: 7, bold: true });
  drawCell(margin + 35, yPos, 30, wpsInfoHeight, wps.weldingProcess, { fontSize: 7, bold: true });
  drawCell(margin + 65, yPos, 35, wpsInfoHeight, `TYPE:`, { fontSize: 7 });
  drawCell(margin + 100, yPos, pageWidth - (margin * 2) - 100, wpsInfoHeight, '', { fontSize: 7 });
  yPos += wpsInfoHeight;

  // JOINTS SECTION (with diagram placeholder and filler metal table)
  const jointsHeight = 50;
  const jointsStartY = yPos;
  
  // JOINTS header
  drawCell(margin, yPos, 30, 5, 'JOINTS', { fontSize: 7, bold: true, fill: true, fillColor: [220, 220, 220] });
  drawCell(margin + 30, yPos, pageWidth - (margin * 2) - 30, 5, 'FILLER METAL', { fontSize: 7, bold: true, fill: true, fillColor: [220, 220, 220], align: 'center' });
  yPos += 5;

  // Joint diagrams (left side) - placeholder boxes
  const diagramWidth = 30;
  const diagramHeight = 22;
  
  // Diagram 1
  drawCell(margin, yPos, diagramWidth, diagramHeight, '', { border: true });
  doc.setFontSize(6);
  doc.text('B-U3-GF', margin + 2, yPos + 3);
  doc.text('δ=6-30mm', margin + 2, yPos + 7);
  doc.text('t=3mm', margin + 2, yPos + 11);
  
  // Diagram 2
  drawCell(margin, yPos + diagramHeight, diagramWidth, diagramHeight, '', { border: true });
  doc.text('TC-U5-GF', margin + 2, yPos + diagramHeight + 3);
  doc.text('δ=3mm', margin + 2, yPos + diagramHeight + 7);
  doc.text('t=5(1-5-0)', margin + 2, yPos + diagramHeight + 11);

  // Filler Metal table (right side)
  const fillerTableX = margin + 30;
  const fillerTableWidth = pageWidth - (margin * 2) - 30;
  let fillerY = yPos;
  
  const fillerRows = [
    ['Bead Sequence', '1-N'],
    ['Process', wps.weldingProcess || 'FCAW'],
    ['AWS SPECIFICATION', wps.fillerMetalSpec || '5.20'],
    ['AWS Class', wps.fillerClass || 'E71T-1C'],
    ['Diameter (mm)', wps.diameter ? `Ø ${wps.diameter} x 7` : 'N/A'],
    ['Electrode trade name', 'N/A'],
    ['F.NO', '6'],
    ['A.NO', '1'],
    ['Fillet', 'N/A'],
    ['Alloy Flux', 'N/A'],
    ['Flux designation', 'N/A'],
    ['Recrushed Slag', 'N/A'],
    ['Flux Type', 'N/A'],
    ['consumable insert', 'N/A'],
    ['Flux Trade Name', 'N/A'],
  ];

  const rowHeight = 3;
  fillerRows.forEach(([label, value]) => {
    drawCell(fillerTableX, fillerY, fillerTableWidth * 0.5, rowHeight, label, { fontSize: 6 });
    drawCell(fillerTableX + (fillerTableWidth * 0.5), fillerY, fillerTableWidth * 0.5, rowHeight, value, { fontSize: 6, bold: true });
    fillerY += rowHeight;
  });

  yPos = jointsStartY + jointsHeight;

  // BACKING SECTION
  const backingHeight = 8;
  drawCell(margin, yPos, 20, backingHeight, 'Backing', { fontSize: 7, bold: true });
  drawCell(margin + 20, yPos, 5, backingHeight, wps.backingUsed === 'YES' ? '☑' : '☐', { fontSize: 10, align: 'center', verticalAlign: 'middle' });
  drawCell(margin + 25, yPos, 10, backingHeight, 'YES', { fontSize: 7 });
  drawCell(margin + 35, yPos, 5, backingHeight, wps.backingUsed === 'NO' ? '☑' : '☐', { fontSize: 10, align: 'center', verticalAlign: 'middle' });
  drawCell(margin + 40, yPos, 10, backingHeight, 'NO', { fontSize: 7 });
  
  drawCell(margin + 50, yPos, 10, backingHeight, 'Type', { fontSize: 7, bold: true });
  drawCell(margin + 60, yPos, 5, backingHeight, wps.backingType2 === 'Base Metal' ? '☑' : '☐', { fontSize: 10, align: 'center', verticalAlign: 'middle' });
  drawCell(margin + 65, yPos, 20, backingHeight, 'Base Metal', { fontSize: 7 });
  drawCell(margin + 85, yPos, 5, backingHeight, wps.backingType2 === 'Weld Metal' ? '☑' : '☐', { fontSize: 10, align: 'center', verticalAlign: 'middle' });
  drawCell(margin + 90, yPos, 20, backingHeight, 'Weld Metal', { fontSize: 7 });
  yPos += backingHeight;

  // BASE METAL SECTION
  drawCell(margin, yPos, pageWidth - (margin * 2), 5, 'BASE METAL', { fontSize: 7, bold: true, fill: true, fillColor: [220, 220, 220] });
  yPos += 5;

  const baseMetalRows = [
    ['Material Spec:', wps.materialSpec || 'ASTM A572 to ASTM A572'],
    ['Material Group:', wps.materialGroup || 'I to I'],
    ['Thick. Range (mm) :', wps.thicknessRange || '3 mm to Unlimited'],
    ['Base Metal :', 'Groove:', wps.baseMetalGroove || 'With'],
    ['', 'Fillet:', wps.baseMetalFillet || 'N/A'],
    ['Material Thick (mm)', wps.materialThickness ? `${wps.materialThickness} mm` : '20 mm'],
  ];

  baseMetalRows.forEach(([label, ...values]) => {
    const cellHeight = 4;
    if (values.length === 1) {
      drawCell(margin, yPos, 60, cellHeight, label, { fontSize: 7 });
      drawCell(margin + 60, yPos, pageWidth - (margin * 2) - 60, cellHeight, values[0], { fontSize: 7, bold: true });
    } else {
      drawCell(margin, yPos, 30, cellHeight, label, { fontSize: 7 });
      drawCell(margin + 30, yPos, 30, cellHeight, values[0], { fontSize: 7 });
      drawCell(margin + 60, yPos, pageWidth - (margin * 2) - 60, cellHeight, values[1], { fontSize: 7, bold: true });
    }
    yPos += cellHeight;
  });

  // POSITION SECTION (right side)
  const positionX = pageWidth - margin - 90;
  let positionY = yPos - 24; // Align with base metal section
  
  drawCell(positionX, positionY, 90, 5, 'POSITION', { fontSize: 7, bold: true, fill: true, fillColor: [220, 220, 220] });
  positionY += 5;
  
  const positionRows = [
    ['Groove', wps.position || 'F-H'],
    ['Fillet', '2F-4F'],
    ['Progression', 'N/A'],
  ];

  positionRows.forEach(([label, value]) => {
    drawCell(positionX, positionY, 45, 4, label, { fontSize: 7 });
    drawCell(positionX + 45, positionY, 45, 4, value, { fontSize: 7, bold: true });
    positionY += 4;
  });

  // PREHEAT SECTION
  drawCell(margin, yPos, pageWidth - (margin * 2), 5, 'PREHEAT', { fontSize: 7, bold: true, fill: true, fillColor: [220, 220, 220] });
  yPos += 5;

  // Preheat table
  const preheatTableData = [
    ['Thick. (mm)', 'Min. Preheat Temp.', 'Max. Interpass Temperature'],
    ['3 to 38', `${wps.preheatTempMin || 10}°C`, `${wps.interpassTempMax || 250}°C`],
    ['> 38 to 65', `${wps.preheatTempMin || 65}°C`, `${wps.interpassTempMax || 250}°C`],
    ['> 65', `${wps.preheatTempMin || 110}°C`, ''],
  ];

  const colWidths = [30, 40, 50];
  preheatTableData.forEach((row, rowIndex) => {
    let xOffset = margin;
    row.forEach((cell, colIndex) => {
      drawCell(
        xOffset,
        yPos,
        colWidths[colIndex],
        4,
        cell,
        {
          fontSize: 7,
          bold: rowIndex === 0,
          fill: rowIndex === 0,
          fillColor: [240, 240, 240],
          align: rowIndex === 0 ? 'center' : 'left',
        }
      );
      xOffset += colWidths[colIndex];
    });
    yPos += 4;
  });

  // ELECTRICAL CHARACTERISTICS (right side)
  const electricalX = positionX;
  let electricalY = positionY + 5;
  
  drawCell(electricalX, electricalY, 90, 5, 'ELECTRICAL CHARACTERISTICS', { fontSize: 7, bold: true, fill: true, fillColor: [220, 220, 220] });
  electricalY += 5;
  
  const electricalRows = [
    ['Current/ Polarity', wps.currentType || 'DCEP'],
    ['Ampere Range(A)', '200-275'],
    ['Volt Range(V)', '27-31'],
    ['Travel Speed (Cm/min)', 'N/A'],
    ['Heat input max. (Kj/Cm)', 'N/A'],
    ['Transfer Mode', 'fcaw ( Globular)'],
    ['Others', 'N/A'],
  ];

  electricalRows.forEach(([label, value]) => {
    drawCell(electricalX, electricalY, 45, 4, label, { fontSize: 6 });
    drawCell(electricalX + 45, electricalY, 45, 4, value, { fontSize: 6, bold: true });
    electricalY += 4;
  });

  // POSTWELD HEAT TREATMENT
  yPos += 2;
  drawCell(margin, yPos, pageWidth - (margin * 2), 5, 'POSTWELD HEAT TREATMENT', { fontSize: 7, bold: true, fill: true, fillColor: [220, 220, 220] });
  yPos += 5;

  drawCell(margin, yPos, 30, 4, 'Type', { fontSize: 7 });
  drawCell(margin + 30, yPos, 30, 4, ': NO PWHT', { fontSize: 7, bold: true });
  yPos += 4;

  const pwhtRows = [
    ['Temp. Range :', ''],
    ['Holding Time :', ''],
    ['Heating Rate :', ''],
    ['Cooling Rate :', ''],
  ];

  pwhtRows.forEach(([label, value]) => {
    drawCell(margin, yPos, 30, 4, label, { fontSize: 7 });
    drawCell(margin + 30, yPos, 30, 4, value, { fontSize: 7 });
    yPos += 4;
  });

  // TECHNIQUE (right side)
  let techniqueY = electricalY + 5;
  
  drawCell(electricalX, techniqueY, 90, 5, 'TECHNIQUE', { fontSize: 7, bold: true, fill: true, fillColor: [220, 220, 220] });
  techniqueY += 5;
  
  const techniqueRows = [
    ['Stringer or Weave Bead', 'String,Weave or both'],
    ['Method Cleaning', 'Grinding and /or Brushing'],
    ['Method Back Gouge', 'Grinding and /or Gouging'],
    ['OSCILLATION', 'N/A'],
  ];

  techniqueRows.forEach(([label, value]) => {
    drawCell(electricalX, techniqueY, 45, 4, label, { fontSize: 6 });
    drawCell(electricalX + 45, techniqueY, 45, 4, value, { fontSize: 6, bold: true });
    techniqueY += 4;
  });

  // GAS SHIELDING COMPOSITION
  yPos += 2;
  drawCell(margin, yPos, pageWidth - (margin * 2), 5, 'GAS SHIELDING COMPOSITION %', { fontSize: 7, bold: true, fill: true, fillColor: [220, 220, 220] });
  yPos += 5;

  const gasRows = [
    ['Type (Gases)', 'Flow Rate (L/Min.)', 'Tube- work Distance(mm)', 'N/A'],
    ['Shielding :', `${wps.shieldingGas || 'CO2 100%'}`, `${wps.flowRate || '10-15'} L / min`, 'N/A'],
    ['Backing :', 'N/A', 'N/A', 'Multiple or Single Pass Per Side', 'Single or Multiple'],
    ['Trailing :', 'N/A', 'N/A', 'Wire Feed Speed', 'N/A'],
    ['Other', 'N/A', 'N/A', 'Electrode Spacing', 'N/A'],
  ];

  gasRows.forEach((row, rowIndex) => {
    if (rowIndex === 0) {
      const headerWidths = [30, 30, 40, 30];
      let xOffset = margin;
      row.forEach((cell, colIndex) => {
        drawCell(xOffset, yPos, headerWidths[colIndex], 4, cell, {
          fontSize: 6,
          bold: true,
          fill: true,
          fillColor: [240, 240, 240],
          align: 'center',
        });
        xOffset += headerWidths[colIndex];
      });
    } else if (row.length === 4) {
      drawCell(margin, yPos, 30, 4, row[0], { fontSize: 6 });
      drawCell(margin + 30, yPos, 30, 4, row[1], { fontSize: 6, bold: true });
      drawCell(margin + 60, yPos, 40, 4, row[2], { fontSize: 6, bold: true });
      drawCell(margin + 100, yPos, 30, 4, row[3], { fontSize: 6 });
    } else {
      drawCell(margin, yPos, 30, 4, row[0], { fontSize: 6 });
      drawCell(margin + 30, yPos, 30, 4, row[1], { fontSize: 6, bold: true });
      drawCell(margin + 60, yPos, 40, 4, row[2], { fontSize: 6, bold: true });
      drawCell(margin + 100, yPos, 30, 4, row[3], { fontSize: 6 });
      drawCell(margin + 130, yPos, pageWidth - (margin * 2) - 130, 4, row[4], { fontSize: 6, bold: true });
    }
    yPos += 4;
  });

  // Additional technique parameters (right side)
  techniqueY += 2;
  const additionalParams = [
    ['Peening', 'N/A'],
    ['Multi or single electrode', 'single'],
    ['Max. single pass layer Width', '7 mm'],
    ['Max. root pass thickness', '4 MM'],
    ['Max. fill pass thickness', '6 mm'],
  ];

  additionalParams.forEach(([label, value]) => {
    drawCell(electricalX, techniqueY, 45, 4, label, { fontSize: 6 });
    drawCell(electricalX + 45, techniqueY, 45, 4, value, { fontSize: 6, bold: true });
    techniqueY += 4;
  });

  // SIGNATURE SECTION
  yPos = pageHeight - margin - 15;
  
  drawCell(margin, yPos, (pageWidth - (margin * 2)) / 2, 5, 'Prepared BY QC Inspector', { fontSize: 7, bold: true, align: 'center', fill: true, fillColor: [240, 240, 240] });
  drawCell(margin + (pageWidth - (margin * 2)) / 2, yPos, (pageWidth - (margin * 2)) / 2, 5, 'Checked BY Welding Engineer', { fontSize: 7, bold: true, align: 'center', fill: true, fillColor: [240, 240, 240] });
  yPos += 5;

  drawCell(margin, yPos, 20, 5, 'Name', { fontSize: 7, bold: true });
  drawCell(margin + 20, yPos, (pageWidth - (margin * 2)) / 2 - 20, 5, wps.preparedBy.name, { fontSize: 7 });
  drawCell(margin + (pageWidth - (margin * 2)) / 2, yPos, 20, 5, 'Name', { fontSize: 7, bold: true });
  drawCell(margin + (pageWidth - (margin * 2)) / 2 + 20, yPos, (pageWidth - (margin * 2)) / 2 - 20, 5, wps.approvedBy?.name || '', { fontSize: 7 });
  yPos += 5;

  drawCell(margin, yPos, 20, 5, 'Signature', { fontSize: 7, bold: true });
  drawCell(margin + 20, yPos, (pageWidth - (margin * 2)) / 2 - 20, 5, '', { fontSize: 7 });
  drawCell(margin + (pageWidth - (margin * 2)) / 2, yPos, 20, 5, 'Signature', { fontSize: 7, bold: true });
  drawCell(margin + (pageWidth - (margin * 2)) / 2 + 20, yPos, (pageWidth - (margin * 2)) / 2 - 20, 5, '', { fontSize: 7 });
  yPos += 5;

  drawCell(margin, yPos, 20, 5, 'Date', { fontSize: 7, bold: true });
  drawCell(margin + 20, yPos, (pageWidth - (margin * 2)) / 2 - 20, 5, wps.dateIssued ? new Date(wps.dateIssued).toLocaleDateString() : new Date().toLocaleDateString(), { fontSize: 7 });
  drawCell(margin + (pageWidth - (margin * 2)) / 2, yPos, 20, 5, 'Date', { fontSize: 7, bold: true });
  drawCell(margin + (pageWidth - (margin * 2)) / 2 + 20, yPos, (pageWidth - (margin * 2)) / 2 - 20, 5, wps.status === 'Approved' && wps.dateIssued ? new Date(wps.dateIssued).toLocaleDateString() : '', { fontSize: 7 });

  // Add stamp/seal area if approved
  if (wps.status === 'Approved') {
    doc.setDrawColor(200, 0, 0);
    doc.setLineWidth(1);
    doc.circle(pageWidth - margin - 30, pageHeight - margin - 25, 15);
    doc.setTextColor(200, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('APPROVED', pageWidth - margin - 30, pageHeight - margin - 28, { align: 'center' });
    doc.setFontSize(8);
    doc.text(new Date(wps.dateIssued || new Date()).toLocaleDateString(), pageWidth - margin - 30, pageHeight - margin - 22, { align: 'center' });
  }

  return doc.output('blob');
}
