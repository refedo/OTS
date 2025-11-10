import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch the report
    const report = await prisma.productionLog.findUnique({
      where: { id },
      include: {
        assemblyPart: {
          include: {
            project: {
              select: {
                projectNumber: true,
                name: true,
                client: {
                  select: {
                    name: true,
                    address: true,
                    country: true,
                  },
                },
              },
            },
            building: {
              select: {
                designation: true,
                name: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Generate HTML for PDF
    const html = generateReportHTML(report);

    // Return HTML that can be printed to PDF by the browser
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="${report.reportNumber}.html"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

function generateReportHTML(report: any): string {
  const dispatchType = report.processType.replace('Dispatched to ', '');
  const date = new Date(report.dateProcessed).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${report.reportNumber} - Dispatch Report</title>
  <style>
    @media print {
      @page {
        size: A4;
        margin: 20mm;
      }
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
      background: white;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #2563eb;
    }
    
    .company-name {
      font-size: 28px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 5px;
    }
    
    .report-title {
      font-size: 20px;
      color: #475569;
      margin-top: 10px;
    }
    
    .report-number {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
      margin-top: 15px;
      padding: 10px;
      background: #eff6ff;
      border-radius: 5px;
    }
    
    .section {
      margin-bottom: 25px;
    }
    
    .section-title {
      font-size: 16px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 12px;
      padding-bottom: 5px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 15px;
    }
    
    .info-item {
      padding: 10px;
      background: #f8fafc;
      border-radius: 5px;
    }
    
    .info-label {
      font-size: 12px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    
    .info-value {
      font-size: 15px;
      color: #1e293b;
      font-weight: 500;
    }
    
    .full-width {
      grid-column: 1 / -1;
    }
    
    .remarks-box {
      padding: 15px;
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      border-radius: 5px;
      margin-top: 10px;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      font-size: 12px;
      color: #64748b;
    }
    
    .signature-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 50px;
    }
    
    .signature-box {
      text-align: center;
    }
    
    .signature-line {
      border-top: 2px solid #333;
      margin-top: 60px;
      padding-top: 10px;
      font-weight: 600;
    }
    
    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 1000;
    }
    
    .print-button:hover {
      background: #1d4ed8;
    }
    
    @media print {
      .print-button {
        display: none;
      }
    }
  </style>
  <script>
    window.onload = function() {
      // Auto-print when page loads
      setTimeout(function() {
        window.print();
      }, 500);
    };
    
    function printReport() {
      window.print();
    }
  </script>
</head>
<body>
  <button class="print-button" onclick="printReport()">🖨️ Print / Save as PDF</button>
  
  <div class="header">
    <div class="company-name">HEXA STEEL</div>
    <div class="report-title">Dispatch Report - ${dispatchType}</div>
    <div class="report-number">${report.reportNumber}</div>
  </div>
  
  <div class="section">
    <div class="section-title">Project Information</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Project Number</div>
        <div class="info-value">${report.assemblyPart.project.projectNumber}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Project Name</div>
        <div class="info-value">${report.assemblyPart.project.name}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Client</div>
        <div class="info-value">${report.assemblyPart.project.client.name}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Building</div>
        <div class="info-value">${report.assemblyPart.building?.designation || 'N/A'} - ${report.assemblyPart.building?.name || 'N/A'}</div>
      </div>
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">Part Details</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Part Designation</div>
        <div class="info-value">${report.assemblyPart.partDesignation}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Part Name</div>
        <div class="info-value">${report.assemblyPart.name}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Assembly Mark</div>
        <div class="info-value">${report.assemblyPart.assemblyMark}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Part Mark</div>
        <div class="info-value">${report.assemblyPart.partMark}</div>
      </div>
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">Dispatch Information</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Dispatch Type</div>
        <div class="info-value">${report.processType}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Dispatch Date</div>
        <div class="info-value">${date}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Quantity Dispatched</div>
        <div class="info-value">${report.processedQty} units</div>
      </div>
      <div class="info-item">
        <div class="info-label">Remaining Quantity</div>
        <div class="info-value">${report.remainingQty} units</div>
      </div>
      ${report.processingTeam ? `
      <div class="info-item">
        <div class="info-label">Processing Team</div>
        <div class="info-value">${report.processingTeam}</div>
      </div>
      ` : ''}
      ${report.processingLocation ? `
      <div class="info-item">
        <div class="info-label">Processing Location</div>
        <div class="info-value">${report.processingLocation}</div>
      </div>
      ` : ''}
    </div>
    
    ${report.remarks ? `
    <div class="remarks-box">
      <div class="info-label">Remarks</div>
      <div class="info-value">${report.remarks}</div>
    </div>
    ` : ''}
  </div>
  
  <div class="section">
    <div class="section-title">Report Details</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Created By</div>
        <div class="info-value">${report.createdBy.name}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Created On</div>
        <div class="info-value">${new Date(report.createdAt).toLocaleString()}</div>
      </div>
    </div>
  </div>
  
  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-line">Prepared By</div>
    </div>
    <div class="signature-box">
      <div class="signature-line">Approved By</div>
    </div>
  </div>
  
  <div class="footer">
    <p>This is a computer-generated document. Report Number: ${report.reportNumber}</p>
    <p>Generated on: ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
  `.trim();
}
