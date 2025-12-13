# 🔗 Linking Delivery Notes to Dispatch Reports

## 📊 Overview

You want to connect the **Delivery Note Report** with **Dispatch Reports** generated from production logs. Here's how to implement this integration.

---

## 🎯 Integration Strategy

### Current State
- ✅ **Delivery Note Report** - Generates PDF with shipment details
- ✅ **Production Logs** - Track production activities
- ⬜ **Dispatch Records** - Need to link these together

### Goal
When a dispatch is created from production logs, automatically generate a delivery note and link them together.

---

## 📁 Database Schema Changes Needed

### Option 1: Add Dispatch Table (Recommended)

```prisma
// prisma/schema.prisma

model Dispatch {
  id                String   @id @default(uuid()) @db.Char(36)
  projectId         String   @db.Char(36)
  buildingId        String?  @db.Char(36)
  
  // Dispatch Details
  dispatchNumber    String   @unique  // e.g., "HU-DN-2908-0463"
  dispatchDate      DateTime @default(now())
  dispatchCount     Int      @default(1)
  
  // Driver Information
  driverName        String
  driverMobile      String
  driverIqama       String
  vehicleType       String
  carNumber         String
  
  // Shipment Details
  totalWeight       Decimal  @db.Decimal(10, 2)
  totalPieces       Int
  incoterm          String?
  approvedBy        String?
  
  // PDF Report
  deliveryNotePath  String?  // Path to generated PDF
  
  // Relations
  project           Project  @relation(fields: [projectId], references: [id])
  building          Building? @relation(fields: [buildingId], references: [id])
  items             DispatchItem[]
  
  // Audit
  createdById       String   @db.Char(36)
  createdBy         User     @relation(fields: [createdById], references: [id])
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@index([projectId])
  @@index([dispatchNumber])
  @@index([dispatchDate])
}

model DispatchItem {
  id                String   @id @default(uuid()) @db.Char(36)
  dispatchId        String   @db.Char(36)
  assemblyPartId    String   @db.Char(36)
  
  quantity          Int
  weight            Decimal  @db.Decimal(10, 2)
  
  dispatch          Dispatch     @relation(fields: [dispatchId], references: [id])
  assemblyPart      AssemblyPart @relation(fields: [assemblyPartId], references: [id])
  
  createdAt         DateTime @default(now())
  
  @@index([dispatchId])
  @@index([assemblyPartId])
}
```

### Option 2: Extend Production Logs

```prisma
model ProductionLog {
  // ... existing fields ...
  
  // Add dispatch fields
  isDispatched      Boolean  @default(false)
  dispatchedAt      DateTime?
  dispatchNumber    String?
  deliveryNotePath  String?  // Link to PDF
}
```

---

## 🔧 Implementation Steps

### Step 1: Create Dispatch API

```typescript
// src/app/api/dispatch/create/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { HexaReportingEngine } from '@/modules/reporting/reportEngine';

const prisma = new PrismaClient();
const reportEngine = new HexaReportingEngine();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      buildingId,
      driverInfo,
      items, // Array of { assemblyPartId, quantity }
    } = body;

    // 1. Create dispatch record
    const dispatch = await prisma.dispatch.create({
      data: {
        projectId,
        buildingId,
        dispatchNumber: generateDispatchNumber(),
        dispatchDate: new Date(),
        driverName: driverInfo.name,
        driverMobile: driverInfo.mobile,
        driverIqama: driverInfo.iqama,
        vehicleType: driverInfo.vehicleType,
        carNumber: driverInfo.carNumber,
        totalPieces: items.length,
        totalWeight: calculateTotalWeight(items),
        createdById: 'user-id', // Get from session
        items: {
          create: items.map((item: any) => ({
            assemblyPartId: item.assemblyPartId,
            quantity: item.quantity,
            weight: item.weight,
          })),
        },
      },
    });

    // 2. Generate delivery note PDF
    const reportResult = await reportEngine.generateReport({
      reportType: 'delivery-note',
      projectId,
      language: 'en',
      options: {
        dispatchId: dispatch.id,
      },
    });

    // 3. Update dispatch with PDF path
    await prisma.dispatch.update({
      where: { id: dispatch.id },
      data: {
        deliveryNotePath: reportResult.filePath,
      },
    });

    // 4. Mark production logs as dispatched
    await prisma.productionLog.updateMany({
      where: {
        assemblyPartId: { in: items.map((i: any) => i.assemblyPartId) },
      },
      data: {
        isDispatched: true,
        dispatchedAt: new Date(),
        dispatchNumber: dispatch.dispatchNumber,
        deliveryNotePath: reportResult.filePath,
      },
    });

    return NextResponse.json({
      status: 'success',
      dispatch,
      deliveryNote: reportResult,
    });
  } catch (error) {
    console.error('Error creating dispatch:', error);
    return NextResponse.json(
      { status: 'error', error: 'Failed to create dispatch' },
      { status: 500 }
    );
  }
}

function generateDispatchNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `HU-DN-${year}${month}-${random}`;
}

function calculateTotalWeight(items: any[]): number {
  return items.reduce((sum, item) => sum + (item.weight || 0), 0);
}
```

### Step 2: Update Delivery Note Data Fetcher

```typescript
// In reportEngine.ts - Update getDeliveryNoteData

private async getDeliveryNoteData(
  projectId: string, 
  dispatchId?: string
): Promise<DeliveryNoteData> {
  try {
    if (dispatchId) {
      // Load from dispatch record
      const dispatch = await prisma.dispatch.findUnique({
        where: { id: dispatchId },
        include: {
          project: {
            include: {
              buildings: true,
            },
          },
          items: {
            include: {
              assemblyPart: true,
            },
          },
        },
      });

      if (!dispatch) {
        throw new Error(`Dispatch not found: ${dispatchId}`);
      }

      // Map dispatch data to delivery note format
      return {
        deliveryNumber: dispatch.dispatchNumber,
        deliveryDate: dispatch.dispatchDate.toLocaleDateString(),
        deliveryCount: dispatch.dispatchCount,
        project: {
          number: dispatch.project.projectNumber,
          name: dispatch.project.name,
          incoterm: dispatch.incoterm || 'DDP',
        },
        approvedBy: dispatch.approvedBy || 'Pending',
        driver: {
          name: dispatch.driverName,
          mobile: dispatch.driverMobile,
          iqama: dispatch.driverIqama,
          vehicleType: dispatch.vehicleType,
          carNumber: dispatch.carNumber,
        },
        items: dispatch.items.map((item, index) => ({
          position: index + 1,
          pid: item.assemblyPart.id.substring(0, 5),
          partName: item.assemblyPart.partMark,
          itemDesignation: item.assemblyPart.assemblyMark,
          itemProfile: item.assemblyPart.profile || 'N/A',
          totalQty: item.quantity,
          dispatchedQty: item.quantity,
          weightPerPc: Number(item.assemblyPart.singlePartWeight) || 0,
          totalWeight: Number(item.weight),
          buildingName: 'Building Name', // Get from relations
        })),
        // ... rest of the data
      };
    } else {
      // Use existing logic for manual generation
      // ... existing code ...
    }
  } catch (error) {
    throw new Error(`Failed to fetch delivery note data: ${error}`);
  }
}
```

### Step 3: Create Dispatch UI Component

```typescript
// src/components/dispatch/CreateDispatchDialog.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Truck } from 'lucide-react';

export function CreateDispatchDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateDispatch = async (formData: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/dispatch/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          ...formData,
        }),
      });

      const result = await response.json();

      if (result.status === 'success') {
        // Open delivery note PDF
        window.open(result.deliveryNote.url, '_blank');
        setOpen(false);
      }
    } catch (error) {
      console.error('Error creating dispatch:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Truck className="h-4 w-4 mr-2" />
        Create Dispatch
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Dispatch & Delivery Note</DialogTitle>
        </DialogHeader>
        {/* Add form fields for driver info, items selection, etc. */}
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🔄 Workflow

### Production → Dispatch → Delivery Note

```
1. Production Complete
   ↓
2. Select items for dispatch
   ↓
3. Enter driver information
   ↓
4. Click "Create Dispatch"
   ↓
5. System creates:
   - Dispatch record in database
   - Delivery note PDF
   - Links production logs to dispatch
   ↓
6. PDF opens automatically
   ↓
7. Driver receives delivery note
```

---

## 📊 Viewing Dispatch History

### List All Dispatches

```typescript
// src/app/api/dispatch/list/route.ts

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  const dispatches = await prisma.dispatch.findMany({
    where: projectId ? { projectId } : {},
    include: {
      project: true,
      items: {
        include: {
          assemblyPart: true,
        },
      },
    },
    orderBy: {
      dispatchDate: 'desc',
    },
  });

  return NextResponse.json({
    status: 'success',
    dispatches,
  });
}
```

### Dispatch List UI

```typescript
// src/app/dispatch/page.tsx

export default function DispatchPage() {
  const [dispatches, setDispatches] = useState([]);

  return (
    <div>
      <h1>Dispatch History</h1>
      <table>
        <thead>
          <tr>
            <th>Dispatch #</th>
            <th>Date</th>
            <th>Project</th>
            <th>Driver</th>
            <th>Items</th>
            <th>Delivery Note</th>
          </tr>
        </thead>
        <tbody>
          {dispatches.map((dispatch) => (
            <tr key={dispatch.id}>
              <td>{dispatch.dispatchNumber}</td>
              <td>{dispatch.dispatchDate}</td>
              <td>{dispatch.project.name}</td>
              <td>{dispatch.driverName}</td>
              <td>{dispatch.totalPieces} items</td>
              <td>
                <a href={dispatch.deliveryNotePath} target="_blank">
                  View PDF
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## ✅ Implementation Checklist

- [ ] **Step 1:** Add Dispatch model to Prisma schema
- [ ] **Step 2:** Run migration: `npx prisma migrate dev`
- [ ] **Step 3:** Create `/api/dispatch/create` endpoint
- [ ] **Step 4:** Update `getDeliveryNoteData()` to accept `dispatchId`
- [ ] **Step 5:** Create dispatch UI component
- [ ] **Step 6:** Add "Create Dispatch" button to production logs
- [ ] **Step 7:** Create dispatch history page
- [ ] **Step 8:** Test end-to-end workflow

---

## 🎯 Quick Start

### Minimal Implementation (No DB Changes)

If you don't want to add database tables yet:

1. **Pass dispatch data directly to report generator:**

```typescript
const response = await fetch('/api/reports/generate', {
  method: 'POST',
  body: JSON.stringify({
    reportType: 'delivery-note',
    projectId: 'xxx',
    language: 'en',
    options: {
      customData: {
        driver: { name: 'John', mobile: '123' },
        items: [...],
      },
    },
  }),
});
```

2. **Update report engine to accept custom data:**

```typescript
// In reportEngine.ts
if (request.options?.customData) {
  data = request.options.customData;
} else {
  data = await this.getDeliveryNoteData(request.projectId);
}
```

---

## 📚 Summary

**To link delivery notes with dispatch reports:**

1. ✅ **Create Dispatch records** in database
2. ✅ **Generate delivery note** when dispatch is created
3. ✅ **Store PDF path** in dispatch record
4. ✅ **Link production logs** to dispatch
5. ✅ **View dispatch history** with delivery notes

**Files to create:**
- `prisma/schema.prisma` - Add Dispatch model
- `src/app/api/dispatch/create/route.ts` - Create dispatch endpoint
- `src/app/api/dispatch/list/route.ts` - List dispatches
- `src/components/dispatch/CreateDispatchDialog.tsx` - UI component
- `src/app/dispatch/page.tsx` - Dispatch history page

The delivery note PDF is automatically generated and linked when you create a dispatch! 🚀
