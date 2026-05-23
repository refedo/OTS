import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const MAX_PER_CATEGORY = 5;

// Run each query independently so one failing model doesn't break the entire search
async function safe<T>(fn: () => Promise<T>): Promise<T | []> {
  try {
    return await fn();
  } catch {
    return [];
  }
}

export const GET = withApiContext(async (req) => {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() ?? '';

  if (q.length < 2) {
    return NextResponse.json({ results: {} });
  }

  try {
    const [
      tasks, projects, initiatives, weeklyIssues, backlogItems, ncrs, rfis,
      assemblyParts, lcrEntries, buildings, users, employees, assets, contracts, hrLetters,
      thirdparties, customerInvoices, supplierInvoices, payments,
      auditPlans, managementReviews, auditFindings, qmsProcesses, approvedSuppliers,
      companyObjectives, bdCompanies, mirPOs,
    ] =
      await Promise.all([
        safe(() => prisma.task.findMany({
          where: {
            OR: [
              { title: { contains: q } },
              { description: { contains: q } },
            ],
          },
          select: { id: true, title: true, status: true, priority: true },
          take: MAX_PER_CATEGORY,
          orderBy: { updatedAt: 'desc' },
        })),

        safe(() => prisma.project.findMany({
          where: {
            deletedAt: null,
            OR: [
              { name: { contains: q } },
              { projectNumber: { contains: q } },
            ],
          },
          select: { id: true, name: true, projectNumber: true, status: true },
          take: MAX_PER_CATEGORY,
          orderBy: { updatedAt: 'desc' },
        })),

        safe(() => prisma.initiative.findMany({
          where: {
            OR: [
              { name: { contains: q } },
              { description: { contains: q } },
              { initiativeNumber: { contains: q } },
            ],
          },
          select: { id: true, name: true, initiativeNumber: true, status: true },
          take: MAX_PER_CATEGORY,
          orderBy: { updatedAt: 'desc' },
        })),

        safe(() => prisma.weeklyIssue.findMany({
          where: {
            OR: [
              { title: { contains: q } },
              { description: { contains: q } },
            ],
          },
          select: { id: true, title: true, issueNumber: true, status: true, priority: true },
          take: MAX_PER_CATEGORY,
          orderBy: { updatedAt: 'desc' },
        })),

        safe(() => prisma.productBacklogItem.findMany({
          where: {
            OR: [
              { title: { contains: q } },
              { description: { contains: q } },
              { code: { contains: q } },
            ],
          },
          select: { id: true, title: true, code: true, status: true, priority: true },
          take: MAX_PER_CATEGORY,
          orderBy: { createdAt: 'desc' },
        })),

        safe(() => prisma.nCRReport.findMany({
          where: {
            OR: [
              { ncrNumber: { contains: q } },
              { description: { contains: q } },
            ],
          },
          select: { id: true, ncrNumber: true, description: true, status: true, severity: true },
          take: MAX_PER_CATEGORY,
          orderBy: { updatedAt: 'desc' },
        })),

        safe(() => prisma.rFIRequest.findMany({
          where: {
            OR: [
              { rfiNumber: { contains: q } },
              { inspectionType: { contains: q } },
            ],
          },
          select: { id: true, rfiNumber: true, inspectionType: true, status: true },
          take: MAX_PER_CATEGORY,
          orderBy: { updatedAt: 'desc' },
        })),

        safe(() => prisma.assemblyPart.findMany({
          where: {
            deletedAt: null,
            OR: [
              { assemblyMark: { contains: q } },
              { partMark: { contains: q } },
              { name: { contains: q } },
              { partDesignation: { contains: q } },
            ],
          },
          select: {
            id: true,
            assemblyMark: true,
            partMark: true,
            name: true,
            partDesignation: true,
            status: true,
            projectId: true,
          },
          take: MAX_PER_CATEGORY,
          orderBy: { updatedAt: 'desc' },
        })),

        safe(() => prisma.$queryRaw<Array<{
          id: string;
          sn: string | null;
          itemLabel: string | null;
          projectNumber: string | null;
          poNumber: string | null;
          status: string | null;
        }>>`
          SELECT id, sn, itemLabel, projectNumber, poNumber, status
          FROM lcr_entries
          WHERE isDeleted = false
            AND (itemLabel LIKE ${`%${q}%`}
              OR projectNumber LIKE ${`%${q}%`}
              OR poNumber LIKE ${`%${q}%`}
              OR mrfNumber LIKE ${`%${q}%`}
              OR awardedToRaw LIKE ${`%${q}%`})
          ORDER BY syncedAt DESC
          LIMIT 5
        `),

        safe(() => prisma.building.findMany({
          where: {
            deletedAt: null,
            OR: [
              { name: { contains: q } },
              { designation: { contains: q } },
            ],
          },
          select: { id: true, name: true, designation: true, projectId: true },
          take: MAX_PER_CATEGORY,
          orderBy: { updatedAt: 'desc' },
        })),

        safe(() => prisma.user.findMany({
          where: {
            status: 'active',
            OR: [
              { name: { contains: q } },
              { email: { contains: q } },
              { position: { contains: q } },
            ],
          },
          select: { id: true, name: true, email: true, position: true },
          take: MAX_PER_CATEGORY,
          orderBy: { name: 'asc' },
        })),

        safe(() => prisma.employee.findMany({
          where: {
            deletedAt: null,
            OR: [
              { fullNameEn: { contains: q } },
              { fullNameAr: { contains: q } },
              { employmentId: { contains: q } },
              { occupation: { contains: q } },
            ],
          },
          select: { id: true, fullNameEn: true, employmentId: true, occupation: true, status: true },
          take: MAX_PER_CATEGORY,
          orderBy: { fullNameEn: 'asc' },
        })),

        safe(() => prisma.asset.findMany({
          where: {
            deletedAt: null,
            OR: [
              { assetCode: { contains: q } },
              { name: { contains: q } },
              { vehicleMake: { contains: q } },
              { vehicleModel: { contains: q } },
              { plateNumber: { contains: q } },
              { serialNumber: { contains: q } },
            ],
          },
          select: {
            id: true, assetSn: true, assetCode: true, name: true, category: true, status: true, plateNumber: true,
            assignments: {
              where: { status: 'ACTIVE', deletedAt: null },
              select: { employee: { select: { fullNameEn: true } } },
              take: 1,
            },
          },
          take: MAX_PER_CATEGORY,
          orderBy: { updatedAt: 'desc' },
        })),

        safe(() => prisma.contract.findMany({
          where: {
            deletedAt: null,
            OR: [
              { title: { contains: q } },
              { contractNumber: { contains: q } },
              { referenceNumber: { contains: q } },
              { issuingAuthority: { contains: q } },
            ],
          },
          select: { id: true, contractNumber: true, title: true, type: true, status: true },
          take: MAX_PER_CATEGORY,
          orderBy: { updatedAt: 'desc' },
        })),

        safe(() => prisma.hrLetter.findMany({
          where: {
            deletedAt: null,
            OR: [
              { letterNumber: { contains: q } },
              { subject: { contains: q } },
            ],
          },
          select: { id: true, letterNumber: true, subject: true, letterType: true, classification: true },
          take: MAX_PER_CATEGORY,
          orderBy: { issuedAt: 'desc' },
        })),

        safe(() => prisma.$queryRaw<Array<{
          id: number;
          name: string | null;
          code_client: string | null;
          code_supplier: string | null;
          client_type: number;
          supplier_type: number;
        }>>`
          SELECT id, name, code_client, code_supplier, client_type, supplier_type
          FROM dolibarr_thirdparties
          WHERE is_active = 1
            AND (name LIKE ${`%${q}%`}
              OR name_alias LIKE ${`%${q}%`}
              OR code_client LIKE ${`%${q}%`}
              OR code_supplier LIKE ${`%${q}%`}
              OR email LIKE ${`%${q}%`})
          ORDER BY name ASC
          LIMIT 5
        `),

        safe(() => prisma.$queryRaw<Array<{
          dolibarr_id: number;
          ref: string | null;
          socid: number | null;
          status: number | null;
          is_paid: number;
          entity_name: string | null;
        }>>`
          SELECT ci.dolibarr_id, ci.ref, ci.socid, ci.status, ci.is_paid,
                 COALESCE(dt.name, CONCAT('Client #', ci.socid)) AS entity_name
          FROM fin_customer_invoices ci
          LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = ci.socid
          WHERE ci.is_active = 1
            AND (ci.ref LIKE ${`%${q}%`}
              OR ci.ref_client LIKE ${`%${q}%`}
              OR dt.name LIKE ${`%${q}%`}
              OR dt.code_client LIKE ${`%${q}%`})
          ORDER BY ci.last_synced_at DESC
          LIMIT 5
        `),

        safe(() => prisma.$queryRaw<Array<{
          dolibarr_id: number;
          ref: string | null;
          socid: number | null;
          status: number | null;
          is_paid: number;
          entity_name: string | null;
        }>>`
          SELECT si.dolibarr_id, si.ref, si.socid, si.status, si.is_paid,
                 COALESCE(dt.name, CONCAT('Supplier #', si.socid)) AS entity_name
          FROM fin_supplier_invoices si
          LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = si.socid
          WHERE si.is_active = 1
            AND (si.ref LIKE ${`%${q}%`}
              OR si.ref_supplier LIKE ${`%${q}%`}
              OR dt.name LIKE ${`%${q}%`}
              OR dt.code_supplier LIKE ${`%${q}%`})
          ORDER BY si.last_synced_at DESC
          LIMIT 5
        `),

        safe(() => prisma.$queryRaw<Array<{
          id: number;
          dolibarr_ref: string | null;
          payment_type: string;
          amount: number | null;
          payment_date: string | null;
          entity_name: string | null;
        }>>`
          SELECT fp.id, fp.dolibarr_ref, fp.payment_type, fp.amount, fp.payment_date,
                 COALESCE(dt.name,
                   CASE fp.payment_type
                     WHEN 'customer' THEN CONCAT('Client #', ci.socid)
                     ELSE CONCAT('Supplier #', si.socid)
                   END
                 ) AS entity_name
          FROM fin_payments fp
          LEFT JOIN fin_customer_invoices ci ON fp.payment_type = 'customer' AND ci.dolibarr_id = fp.invoice_dolibarr_id
          LEFT JOIN fin_supplier_invoices si ON fp.payment_type = 'supplier' AND si.dolibarr_id = fp.invoice_dolibarr_id
          LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = COALESCE(ci.socid, si.socid)
          WHERE fp.dolibarr_ref LIKE ${`%${q}%`}
          ORDER BY fp.payment_date DESC
          LIMIT 5
        `),

        // ─── IMS & Business Planning ───────────────────────────────────────────
        safe(() => prisma.imsAuditPlan.findMany({
          where: {
            OR: [
              { planNumber: { contains: q } },
              { auditType: { contains: q } },
            ],
          },
          select: { id: true, planNumber: true, year: true, auditType: true, status: true },
          take: MAX_PER_CATEGORY,
          orderBy: { year: 'desc' },
        })),

        safe(() => prisma.imsManagementReview.findMany({
          where: {
            deletedAt: null,
            OR: [
              { reviewNumber: { contains: q } },
              { period: { contains: q } },
              { chairperson: { contains: q } },
            ],
          },
          select: { id: true, reviewNumber: true, period: true, chairperson: true, status: true, reviewDate: true },
          take: MAX_PER_CATEGORY,
          orderBy: { reviewDate: 'desc' },
        })),

        safe(() => prisma.imsAuditFinding.findMany({
          where: {
            OR: [
              { findingNumber: { contains: q } },
              { description: { contains: q } },
              { clause: { contains: q } },
            ],
          },
          select: { id: true, findingNumber: true, type: true, clause: true, description: true, status: true, auditId: true },
          take: MAX_PER_CATEGORY,
          orderBy: { createdAt: 'desc' },
        })),

        safe(() => prisma.imsQmsProcess.findMany({
          where: {
            deletedAt: null,
            OR: [
              { processNumber: { contains: q } },
              { name: { contains: q } },
              { processOwner: { contains: q } },
              { isoClause: { contains: q } },
            ],
          },
          select: { id: true, processNumber: true, name: true, processOwner: true, processType: true, status: true },
          take: MAX_PER_CATEGORY,
          orderBy: { processNumber: 'asc' },
        })),

        safe(() => prisma.scApprovedSupplier.findMany({
          where: {
            deletedAt: null,
            OR: [
              { supplierCode: { contains: q } },
              { name: { contains: q } },
              { category: { contains: q } },
            ],
          },
          select: { id: true, supplierCode: true, name: true, category: true, approvalStatus: true, rating: true },
          take: MAX_PER_CATEGORY,
          orderBy: { name: 'asc' },
        })),

        safe(() => prisma.companyObjective.findMany({
          where: {
            OR: [
              { title: { contains: q } },
              { description: { contains: q } },
              { category: { contains: q } },
            ],
          },
          select: { id: true, title: true, year: true, category: true, status: true, priority: true, progress: true },
          take: MAX_PER_CATEGORY,
          orderBy: { year: 'desc' },
        })),

        safe(() => prisma.bdCompany.findMany({
          where: {
            deletedAt: null,
            OR: [
              { name: { contains: q } },
              { vendorId: { contains: q } },
              { contactName: { contains: q } },
              { contactEmail: { contains: q } },
            ],
          },
          select: { id: true, name: true, vendorId: true, registrationStatus: true, contactName: true },
          take: MAX_PER_CATEGORY,
          orderBy: { updatedAt: 'desc' },
        })),

        // ─── Purchase Orders (via linked MIRs) ──────────────────────────────────
        safe(() => prisma.materialInspectionReceipt.findMany({
          where: {
            OR: [
              { dolibarrPoRef: { contains: q } },
              { supplierName: { contains: q } },
            ],
          },
          select: {
            id: true,
            dolibarrPoRef: true,
            dolibarrPoId: true,
            supplierName: true,
            receiptNumber: true,
            status: true,
          },
          take: MAX_PER_CATEGORY,
          orderBy: { createdAt: 'desc' },
        })),
      ]);

    const taskArr = Array.isArray(tasks) ? tasks : [];
    const mirPOArr = Array.isArray(mirPOs) ? mirPOs : [];
    const projectArr = Array.isArray(projects) ? projects : [];
    const initiativeArr = Array.isArray(initiatives) ? initiatives : [];
    const weeklyIssueArr = Array.isArray(weeklyIssues) ? weeklyIssues : [];
    const backlogArr = Array.isArray(backlogItems) ? backlogItems : [];
    const ncrArr = Array.isArray(ncrs) ? ncrs : [];
    const rfiArr = Array.isArray(rfis) ? rfis : [];
    const assemblyArr = Array.isArray(assemblyParts) ? assemblyParts : [];
    const lcrArr = Array.isArray(lcrEntries) ? lcrEntries : [];
    const buildingArr = Array.isArray(buildings) ? buildings : [];
    const userArr = Array.isArray(users) ? users : [];
    const employeeArr = Array.isArray(employees) ? employees : [];
    const assetArr = Array.isArray(assets) ? assets : [];
    const contractArr = Array.isArray(contracts) ? contracts : [];
    const hrLetterArr = Array.isArray(hrLetters) ? hrLetters : [];
    const thirdpartyArr = Array.isArray(thirdparties) ? thirdparties : [];
    const customerInvoiceArr = Array.isArray(customerInvoices) ? customerInvoices : [];
    const supplierInvoiceArr = Array.isArray(supplierInvoices) ? supplierInvoices : [];
    const paymentArr = Array.isArray(payments) ? payments : [];
    const auditPlanArr = Array.isArray(auditPlans) ? auditPlans : [];
    const managementReviewArr = Array.isArray(managementReviews) ? managementReviews : [];
    const auditFindingArr = Array.isArray(auditFindings) ? auditFindings : [];
    const qmsProcessArr = Array.isArray(qmsProcesses) ? qmsProcesses : [];
    const approvedSupplierArr = Array.isArray(approvedSuppliers) ? approvedSuppliers : [];
    const companyObjectiveArr = Array.isArray(companyObjectives) ? companyObjectives : [];
    const bdCompanyArr = Array.isArray(bdCompanies) ? bdCompanies : [];

    return NextResponse.json({
      results: {
        tasks: taskArr.map((t) => ({
          id: t.id,
          title: t.title,
          subtitle: t.status,
          badge: t.priority,
          url: `/tasks/${t.id}`,
          type: 'Task',
        })),
        projects: projectArr.map((p) => ({
          id: p.id,
          title: p.name,
          subtitle: p.projectNumber,
          badge: p.status,
          url: `/projects/${p.id}`,
          type: 'Project',
        })),
        initiatives: initiativeArr.map((i) => ({
          id: i.id,
          title: i.name,
          subtitle: i.initiativeNumber,
          badge: i.status,
          url: `/business-planning/initiatives`,
          type: 'Initiative',
        })),
        weeklyIssues: weeklyIssueArr.map((w) => ({
          id: w.id,
          title: w.title,
          subtitle: `#${w.issueNumber}`,
          badge: w.status,
          url: `/business-planning/issues`,
          type: 'Weekly Issue',
        })),
        backlogItems: backlogArr.map((b) => ({
          id: b.id,
          title: b.title,
          subtitle: b.code,
          badge: String(b.status),
          url: `/backlog/${b.id}`,
          type: 'Backlog',
        })),
        ncrs: ncrArr.map((n) => ({
          id: n.id,
          title: `NCR ${n.ncrNumber}`,
          subtitle: n.description.slice(0, 60),
          badge: n.status,
          url: `/qc/ncr`,
          type: 'NCR',
        })),
        rfis: rfiArr.map((r) => ({
          id: r.id,
          title: `RFI ${r.rfiNumber ?? r.id.slice(0, 8)}`,
          subtitle: r.inspectionType,
          badge: r.status,
          url: `/qc/rfi`,
          type: 'RFI',
        })),
        assemblyParts: assemblyArr.map((a) => ({
          id: a.id,
          title: a.assemblyMark,
          subtitle: `${a.name} — ${a.partDesignation}`,
          badge: a.status,
          url: `/production?project=${a.projectId}`,
          type: 'Assembly',
        })),
        lcrEntries: lcrArr.map((l) => ({
          id: l.id,
          title: l.itemLabel ?? `LCR ${l.sn ?? l.id.slice(0, 8)}`,
          subtitle: `${l.projectNumber ?? 'Unknown'} — ${l.poNumber ? `PO: ${l.poNumber}` : 'No PO'}`,
          badge: l.status ?? 'Unknown',
          url: `/supply-chain/lcr`,
          type: 'LCR',
        })),
        buildings: buildingArr.map((b) => ({
          id: b.id,
          title: b.name || b.designation,
          subtitle: b.designation,
          badge: 'Building',
          url: `/projects/${b.projectId}`,
          type: 'Building',
        })),
        users: userArr.map((u) => ({
          id: u.id,
          title: u.name,
          subtitle: u.position ?? u.email,
          badge: 'User',
          url: `/settings/users/${u.id}`,
          type: 'User',
        })),
        employees: employeeArr.map((e) => ({
          id: e.id,
          title: e.fullNameEn,
          subtitle: `${e.employmentId}${e.occupation ? ` · ${e.occupation}` : ''}`,
          badge: e.status,
          url: `/hr/employees/${e.id}`,
          type: 'Employee',
        })),
        assets: assetArr.map((a) => {
          const assignedTo = (a as { assignments?: Array<{ employee: { fullNameEn: string } }> }).assignments?.[0]?.employee?.fullNameEn;
          const parts = [a.assetCode, a.category.replace(/_/g, ' ')];
          if (a.plateNumber) parts.push(a.plateNumber);
          if (assignedTo) parts.push(`→ ${assignedTo}`);
          return {
            id: a.id,
            title: a.name,
            subtitle: parts.join(' · '),
            badge: a.status,
            url: `/hr/assets`,
            type: 'Asset',
          };
        }),
        contracts: contractArr.map((c) => ({
          id: c.id,
          title: c.title,
          subtitle: `${c.contractNumber} · ${c.type.replace(/_/g, ' ')}`,
          badge: c.status,
          url: `/hr/contracts`,
          type: 'Contract',
        })),
        hrLetters: hrLetterArr.map((l) => ({
          id: l.id,
          title: l.subject,
          subtitle: `${l.letterNumber} · ${l.letterType.replace(/_/g, ' ')}`,
          badge: l.classification,
          url: `/hr/letters`,
          type: 'Letter',
        })),
        thirdparties: thirdpartyArr.map((t) => {
          const isCustomer = Number(t.client_type) > 0;
          const isSupplier = Number(t.supplier_type) > 0;
          const role = isCustomer && isSupplier ? 'Customer & Supplier' : isCustomer ? 'Customer' : 'Supplier';
          const code = isCustomer ? t.code_client : t.code_supplier;
          return {
            id: String(t.id),
            title: t.name || `Party #${t.id}`,
            subtitle: code ? `${code} · ${role}` : role,
            badge: role,
            url: `/financial/thirdparties`,
            type: 'Thirdparty',
          };
        }),
        customerInvoices: customerInvoiceArr.map((i) => ({
          id: String(i.dolibarr_id),
          title: i.ref || `Invoice #${i.dolibarr_id}`,
          subtitle: i.entity_name || 'Unknown client',
          badge: i.is_paid ? 'Paid' : 'Unpaid',
          url: `/financial/invoices/customer`,
          type: 'Customer Invoice',
        })),
        supplierInvoices: supplierInvoiceArr.map((i) => ({
          id: String(i.dolibarr_id),
          title: i.ref || `Invoice #${i.dolibarr_id}`,
          subtitle: i.entity_name || 'Unknown supplier',
          badge: i.is_paid ? 'Paid' : 'Unpaid',
          url: `/financial/invoices/supplier`,
          type: 'Supplier Invoice',
        })),
        payments: paymentArr.map((p) => ({
          id: String(p.id),
          title: p.dolibarr_ref || `Payment #${p.id}`,
          subtitle: p.entity_name || 'Unknown',
          badge: p.payment_type === 'customer' ? 'Income' : 'Expense',
          url: `/financial/payments`,
          type: 'Payment',
        })),
        auditPlans: auditPlanArr.map((a) => ({
          id: a.id,
          title: a.planNumber,
          subtitle: `${a.auditType} · ${a.year}`,
          badge: a.status,
          url: `/ims/audit-plans/${a.id}`,
          type: 'Audit Plan',
        })),
        managementReviews: managementReviewArr.map((r) => ({
          id: r.id,
          title: r.reviewNumber,
          subtitle: `${r.period} · ${r.chairperson}`,
          badge: r.status,
          url: `/ims/management-review`,
          type: 'Management Review',
        })),
        auditFindings: auditFindingArr.map((f) => ({
          id: f.id,
          title: `${f.findingNumber} — ${f.type}`,
          subtitle: f.description.length > 60 ? f.description.slice(0, 57) + '…' : f.description,
          badge: f.status,
          url: `/ims/audit-plans`,
          type: 'Audit Finding',
        })),
        qmsProcesses: qmsProcessArr.map((p) => ({
          id: p.id,
          title: p.name,
          subtitle: `${p.processNumber} · ${p.processType.replace('_', ' ')}`,
          badge: p.status,
          url: `/ims/processes`,
          type: 'QMS Process',
        })),
        approvedSuppliers: approvedSupplierArr.map((s) => ({
          id: s.id,
          title: s.name,
          subtitle: `${s.supplierCode} · ${s.category ?? 'General'}`,
          badge: s.approvalStatus,
          url: `/supply-chain/suppliers/${s.id}`,
          type: 'Supplier Portal',
        })),
        companyObjectives: companyObjectiveArr.map((o) => ({
          id: o.id,
          title: o.title,
          subtitle: `${o.year} · ${o.category} · ${Math.round(o.progress)}%`,
          badge: o.status,
          url: `/business-planning/objectives`,
          type: 'Objective',
        })),
        bdCompanies: bdCompanyArr.map((c) => ({
          id: c.id,
          title: c.name,
          subtitle: c.vendorId ? `${c.vendorId} · ${c.contactName ?? ''}` : (c.contactName ?? 'Business Dev'),
          badge: c.registrationStatus.replace(/_/g, ' '),
          url: `/business-development`,
          type: 'BD Company',
        })),
        purchaseOrders: mirPOArr.map((m) => ({
          id: m.id,
          title: m.dolibarrPoRef ?? `PO #${m.dolibarrPoId}`,
          subtitle: `${m.supplierName ?? 'Unknown supplier'} · MIR ${m.receiptNumber}`,
          badge: m.status,
          url: `/dolibarr?tab=purchase-orders&search=${encodeURIComponent(m.dolibarrPoRef ?? '')}`,
          type: 'Purchase Order',
        })),
      },
    });
  } catch (error) {
    logger.error({ error, q }, 'Global search failed');
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
});
