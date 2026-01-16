import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

export async function GET(request: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('reportType') || 'all';
    const projectId = searchParams.get('projectId') || 'all';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const includeRemarks = searchParams.get('includeRemarks') === 'true';
    const groupByBuilding = searchParams.get('groupByBuilding') === 'true';

    if (!dateFrom || !dateTo) {
      return NextResponse.json({ error: 'Date range is required' }, { status: 400 });
    }

    // Map report type to process type
    const processTypeMap: { [key: string]: string } = {
      sandblasting: 'Dispatched to Sandblasting',
      galvanization: 'Dispatched to Galvanization',
      painting: 'Dispatched to Painting',
      site: 'Dispatched to Site',
      customer: 'Dispatched to Customer',
    };

    // Build where clause
    const where: any = {
      dateProcessed: {
        gte: new Date(dateFrom),
        lte: new Date(dateTo + 'T23:59:59'),
      },
      reportNumber: {
        not: null,
      },
    };

    if (reportType !== 'all') {
      where.processType = processTypeMap[reportType];
    } else {
      where.processType = {
        startsWith: 'Dispatched',
      };
    }

    if (projectId !== 'all') {
      where.assemblyPart = {
        project: {
          projectNumber: projectId,
        },
      };
    }

    // Fetch dispatch logs
    const logs = await prisma.productionLog.findMany({
      where,
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
      },
      orderBy: [
        { assemblyPart: { project: { projectNumber: 'asc' } } },
        { assemblyPart: { building: { designation: 'asc' } } },
        { dateProcessed: 'asc' },
      ],
    });

    // Generate HTML report
    const html = generateDispatchReportHTML(logs, {
      reportType,
      projectId,
      dateFrom,
      dateTo,
      includeRemarks,
      groupByBuilding,
    });

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="dispatch-report-${reportType}-${dateFrom}-${dateTo}.html"`,
      },
    });
  } catch (error) {
    console.error('Error generating dispatch report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

function generateDispatchReportHTML(logs: any[], options: any): string {
  const { reportType, dateFrom, dateTo, includeRemarks, groupByBuilding } = options;
  
  const reportTypeLabels: { [key: string]: string } = {
    sandblasting: 'Dispatched to Sandblasting',
    galvanization: 'Dispatched to Galvanization',
    painting: 'Dispatched to Painting',
    site: 'Dispatched to Site',
    customer: 'Dispatched to Customer',
    all: 'All Dispatch Types',
  };

  const reportTitle = reportTypeLabels[reportType] || 'Dispatch Report';
  const totalQuantity = logs.reduce((sum, log) => sum + log.processedQty, 0);
  const totalItems = logs.length;

  // Group logs if needed
  let groupedLogs: { [key: string]: any[] } = {};
  if (groupByBuilding) {
    logs.forEach(log => {
      const key = `${log.assemblyPart.project.projectNumber}-${log.assemblyPart.building?.designation || 'NO-BUILDING'}`;
      if (!groupedLogs[key]) {
        groupedLogs[key] = [];
      }
      groupedLogs[key].push(log);
    });
  } else {
    groupedLogs['all'] = logs;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${reportTitle} - ${dateFrom} to ${dateTo}</title>
  <style>
    @media print {
      @page {
        size: A4 landscape;
        margin: 15mm;
      }
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      .no-print {
        display: none;
      }
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.4;
      color: #333;
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
      font-size: 32px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 5px;
    }
    
    .report-title {
      font-size: 24px;
      color: #475569;
      margin-top: 10px;
      font-weight: 600;
    }
    
    .report-period {
      font-size: 16px;
      color: #64748b;
      margin-top: 8px;
    }
    
    .summary-section {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    
    .summary-card {
      padding: 15px;
      background: #f8fafc;
      border-radius: 8px;
      border-left: 4px solid #2563eb;
    }
    
    .summary-label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    
    .summary-value {
      font-size: 24px;
      font-weight: bold;
      color: #1e293b;
    }
    
    .group-header {
      background: #eff6ff;
      padding: 12px 15px;
      margin: 25px 0 15px 0;
      border-left: 4px solid #2563eb;
      font-weight: 600;
      font-size: 16px;
      color: #1e40af;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      font-size: 13px;
    }
    
    thead {
      background: #1e40af;
      color: white;
    }
    
    th {
      padding: 12px 8px;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    td {
      padding: 10px 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    tbody tr:hover {
      background: #f8fafc;
    }
    
    tbody tr:nth-child(even) {
      background: #fafafa;
    }
    
    .report-number {
      font-weight: 600;
      color: #2563eb;
    }
    
    .quantity {
      font-weight: 600;
      text-align: center;
    }
    
    .remarks-cell {
      font-size: 11px;
      color: #64748b;
      max-width: 200px;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      font-size: 11px;
      color: #64748b;
      text-align: center;
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
    
    .no-data {
      text-align: center;
      padding: 40px;
      color: #64748b;
      font-size: 16px;
    }
  </style>
  <script>
    window.onload = function() {
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
  <button class="print-button no-print" onclick="printReport()">🖨️ Print / Save as PDF</button>
  
  <div class="header">
    <div class="company-name">HEXA STEEL</div>
    <div class="report-title">${reportTitle}</div>
    <div class="report-period">Period: ${new Date(dateFrom).toLocaleDateString()} - ${new Date(dateTo).toLocaleDateString()}</div>
  </div>
  
  <div class="summary-section">
    <div class="summary-card">
      <div class="summary-label">Total Items</div>
      <div class="summary-value">${totalItems}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Total Quantity</div>
      <div class="summary-value">${totalQuantity} units</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Report Date</div>
      <div class="summary-value" style="font-size: 16px;">${new Date().toLocaleDateString()}</div>
    </div>
  </div>
  
  ${logs.length === 0 ? `
    <div class="no-data">
      <p>No dispatch records found for the selected criteria.</p>
    </div>
  ` : Object.keys(groupedLogs).map(groupKey => {
    const groupLogs = groupedLogs[groupKey];
    const groupTotal = groupLogs.reduce((sum: number, log: any) => sum + log.processedQty, 0);
    
    return `
      ${groupByBuilding && groupKey !== 'all' ? `
        <div class="group-header">
          Project: ${groupLogs[0].assemblyPart.project.projectNumber} - ${groupLogs[0].assemblyPart.project.name} | 
          Building: ${groupLogs[0].assemblyPart.building?.designation || 'N/A'} - ${groupLogs[0].assemblyPart.building?.name || 'N/A'} | 
          Items: ${groupLogs.length} | 
          Total Qty: ${groupTotal} units
        </div>
      ` : ''}
      
      <table>
        <thead>
          <tr>
            <th style="width: 10%;">Report #</th>
            <th style="width: 12%;">Part Designation</th>
            <th style="width: 15%;">Part Name</th>
            <th style="width: 10%;">Project</th>
            <th style="width: 8%;">Building</th>
            <th style="width: 8%;">Date</th>
            <th style="width: 7%;">Qty</th>
            <th style="width: 10%;">Dispatch Type</th>
            ${includeRemarks ? '<th style="width: 20%;">Remarks</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${groupLogs.map((log: any) => `
            <tr>
              <td class="report-number">${log.reportNumber}</td>
              <td>${log.assemblyPart.partDesignation}</td>
              <td>${log.assemblyPart.name}</td>
              <td>${log.assemblyPart.project.projectNumber}</td>
              <td>${log.assemblyPart.building?.designation || 'N/A'}</td>
              <td>${new Date(log.dateProcessed).toLocaleDateString()}</td>
              <td class="quantity">${log.processedQty}</td>
              <td>${log.processType.replace('Dispatched to ', '')}</td>
              ${includeRemarks ? `<td class="remarks-cell">${log.remarks || '-'}</td>` : ''}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }).join('')}
  
  <div class="footer">
    <p><strong>HEXA STEEL</strong> - Dispatch Report</p>
    <p>Generated on: ${new Date().toLocaleString()} | Total Items: ${totalItems} | Total Quantity: ${totalQuantity} units</p>
  </div>
</body>
</html>
  `.trim();
}
