import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SupplierListRow {
  dolibarr_id: number;
  name: string;
  code_supplier: string | null;
  email: string | null;
  phone: string | null;
  town: string | null;
  country_code: string | null;
  is_active: number;
  approval_status: string | null;
  approval_rating: string | null;
  approved_supplier_id: string | null;
  cost_category: string | null;
  credit_limit: number | null;
  net_days: number | null;
}

export interface SupplierOverview {
  dolibarr_id: number;
  name: string;
  name_alias: string | null;
  code_supplier: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  zip: string | null;
  town: string | null;
  country_code: string | null;
  tva_intra: string | null;
  credit_limit: number | null;
  contacts: SupplierContact[];
  approved_supplier: ApprovedSupplierInfo | null;
  active_payment_terms: PaymentTermsRow | null;
  coa_ap_account: CoaAccountInfo | null;
  coa_cogs_account: CoaAccountInfo | null;
  cost_category: string | null;
  evaluation_count: number;
}

interface SupplierContact {
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  phone_pro: string | null;
  phone_mobile: string | null;
  poste: string | null;
}

interface ApprovedSupplierInfo {
  id: string;
  supplierCode: string;
  approvalStatus: string;
  rating: string | null;
  approvalDate: Date | null;
  expiryDate: Date | null;
  lastAuditDate: Date | null;
  scopeOfApproval: string | null;
}

export interface PaymentTermsRow {
  id: number;
  net_days: number;
  discount_days: number | null;
  discount_percentage: number | null;
  valid_from: string;
  valid_to: string | null;
  notes: string | null;
  created_by_id: string | null;
  created_at: string;
}

interface CoaAccountInfo {
  account_code: string;
  account_name: string | null;
  account_name_ar: string | null;
}

export interface EvaluationRow {
  id: string;
  dolibarr_id: number;
  evaluation_date: string;
  evaluation_period: string | null;
  score_quality: number;
  score_delivery: number;
  score_price: number;
  score_service: number;
  score_documentation: number;
  score_hse: number;
  weighted_score: number;
  rating: string;
  outcome: string;
  notes_quality: string | null;
  notes_delivery: string | null;
  notes_price: string | null;
  notes_service: string | null;
  notes_documentation: string | null;
  notes_hse: string | null;
  general_notes: string | null;
  evaluator_id: string | null;
  evaluator_name: string | null;
  created_by_id: string | null;
  created_by_name: string | null;
  created_at: string;
}

export interface CreateEvaluationInput {
  evaluation_date: string;
  evaluation_period?: string;
  score_quality: number;
  score_delivery: number;
  score_price: number;
  score_service: number;
  score_documentation: number;
  score_hse: number;
  notes_quality?: string;
  notes_delivery?: string;
  notes_price?: string;
  notes_service?: string;
  notes_documentation?: string;
  notes_hse?: string;
  general_notes?: string;
  evaluator_id?: string;
  created_by_id: string;
}

export interface CreatePaymentTermsInput {
  net_days: number;
  discount_days?: number;
  discount_percentage?: number;
  valid_from: string;
  notes?: string;
  created_by_id: string;
}

// ---------------------------------------------------------------------------
// Weight constants (ISO9001 Form-002)
// ---------------------------------------------------------------------------

const WEIGHTS = {
  quality: 0.25,
  delivery: 0.20,
  price: 0.20,
  service: 0.15,
  documentation: 0.15,
  hse: 0.05,
};

export function computeWeightedScore(scores: {
  quality: number; delivery: number; price: number;
  service: number; documentation: number; hse: number;
}): number {
  return (
    scores.quality * 20 * WEIGHTS.quality +
    scores.delivery * 20 * WEIGHTS.delivery +
    scores.price * 20 * WEIGHTS.price +
    scores.service * 20 * WEIGHTS.service +
    scores.documentation * 20 * WEIGHTS.documentation +
    scores.hse * 20 * WEIGHTS.hse
  );
}

export function scoreToRating(score: number): string {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  return 'D';
}

export function ratingToOutcome(rating: string): string {
  if (rating === 'A') return 'APPROVED';
  if (rating === 'B') return 'CONDITIONAL';
  if (rating === 'C') return 'SUSPENDED';
  return 'REJECTED';
}

// ---------------------------------------------------------------------------
// Supplier List
// ---------------------------------------------------------------------------

const SORT_COL_MAP: Record<string, string> = {
  name:            'dt.name',
  approval_status: 'sas.approvalStatus',
  approval_rating: 'sas.rating',
  credit_limit:    'cl.credit_limit',
  net_days:        'pt.net_days',
};

export async function getSupplierList(
  search: string | null,
  page: number,
  limit: number,
  sortKey: string = 'name',
  sortDir: 'asc' | 'desc' = 'asc',
): Promise<{ suppliers: SupplierListRow[]; total: number }> {
  const offset = (page - 1) * limit;
  const searchFilter = search ? `AND dt.name LIKE ?` : '';
  const searchArgs = search ? [`%${search}%`] : [];
  const col = SORT_COL_MAP[sortKey] ?? 'dt.name';
  const dir = sortDir === 'desc' ? 'DESC' : 'ASC';
  const orderClause = `ORDER BY ${col} ${dir} NULLS LAST, dt.name ASC`;

  const rows = await prisma.$queryRawUnsafe<SupplierListRow[]>(`
    SELECT
      dt.dolibarr_id,
      dt.name,
      dt.code_supplier,
      dt.email,
      dt.phone,
      dt.town,
      dt.country_code,
      dt.is_active,
      sas.approvalStatus AS approval_status,
      sas.rating         AS approval_rating,
      sas.id             AS approved_supplier_id,
      sc.cost_category,
      cl.credit_limit,
      pt.net_days
    FROM dolibarr_thirdparties dt
    LEFT JOIN ScApprovedSupplier sas
      ON sas.dolibarr_id = dt.dolibarr_id AND sas.deletedAt IS NULL
    LEFT JOIN fin_supplier_classification sc
      ON sc.supplier_id = dt.dolibarr_id
    LEFT JOIN sc_supplier_credit_limit_history cl
      ON cl.supplier_dolibarr_id = dt.dolibarr_id AND cl.valid_to IS NULL
    LEFT JOIN sc_supplier_payment_terms pt
      ON pt.supplier_dolibarr_id = dt.dolibarr_id AND pt.valid_to IS NULL
    WHERE dt.is_active = 1
      AND (
        dt.supplier_type = 1
        OR EXISTS (
          SELECT 1 FROM fin_supplier_invoices si WHERE si.socid = dt.dolibarr_id AND si.is_active = 1
        )
        OR EXISTS (
          SELECT 1 FROM ScApprovedSupplier sas2 WHERE sas2.dolibarr_id = dt.dolibarr_id AND sas2.deletedAt IS NULL
        )
      )
      ${searchFilter}
    ${orderClause}
    LIMIT ? OFFSET ?
  `, ...searchArgs, limit, offset);

  const countRows = await prisma.$queryRawUnsafe<[{ cnt: bigint }]>(`
    SELECT COUNT(*) AS cnt
    FROM dolibarr_thirdparties dt
    WHERE dt.is_active = 1
      AND (
        dt.supplier_type = 1
        OR EXISTS (
          SELECT 1 FROM fin_supplier_invoices si WHERE si.socid = dt.dolibarr_id AND si.is_active = 1
        )
        OR EXISTS (
          SELECT 1 FROM ScApprovedSupplier sas WHERE sas.dolibarr_id = dt.dolibarr_id AND sas.deletedAt IS NULL
        )
      )
      ${searchFilter}
  `, ...searchArgs);

  return {
    suppliers: rows.map(r => ({
      ...r,
      dolibarr_id: Number(r.dolibarr_id),
      credit_limit: r.credit_limit != null ? Number(r.credit_limit) : null,
      net_days: r.net_days != null ? Number(r.net_days) : null,
    })),
    total: Number(countRows[0]?.cnt ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Supplier Overview
// ---------------------------------------------------------------------------

export async function getSupplierOverview(dolibarrId: number): Promise<SupplierOverview | null> {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT
      dt.dolibarr_id, dt.name, dt.name_alias, dt.code_supplier,
      dt.email, dt.phone, dt.address, dt.zip, dt.town, dt.country_code,
      dt.tva_intra,
      COALESCE(
        (SELECT credit_limit FROM sc_supplier_credit_limit_history
         WHERE supplier_dolibarr_id = dt.dolibarr_id AND valid_to IS NULL LIMIT 1),
        dt.outstanding_limit
      ) AS credit_limit,
      coa_ap.coa_account_code AS ap_account_code,
      coa_ap_def.account_name AS ap_account_name,
      coa_ap_def.account_name_ar AS ap_account_name_ar,
      sc.cost_category,
      sc.coa_account_code AS cogs_account_code,
      coa_cogs.account_name AS cogs_account_name,
      coa_cogs.account_name_ar AS cogs_account_name_ar
    FROM dolibarr_thirdparties dt
    LEFT JOIN fin_supplier_coa_default coa_ap ON coa_ap.supplier_dolibarr_id = dt.dolibarr_id
    LEFT JOIN fin_chart_of_accounts coa_ap_def ON coa_ap_def.account_code = coa_ap.coa_account_code
    LEFT JOIN fin_supplier_classification sc ON sc.supplier_id = dt.dolibarr_id
    LEFT JOIN fin_chart_of_accounts coa_cogs ON coa_cogs.account_code = sc.coa_account_code
    WHERE dt.dolibarr_id = ?
  `, dolibarrId);

  if (!rows.length) return null;
  const row = rows[0];

  const contacts = await prisma.$queryRawUnsafe<SupplierContact[]>(`
    SELECT firstname, lastname, email, phone_pro, phone_mobile, poste
    FROM dolibarr_contacts
    WHERE dolibarr_thirdparty_id = ? AND is_active = 1
    ORDER BY lastname, firstname
  `, dolibarrId);

  const approvedSupplier = await prisma.scApprovedSupplier.findFirst({
    where: { dolibarrId, deletedAt: null },
    select: {
      id: true, supplierCode: true, approvalStatus: true, rating: true,
      approvalDate: true, expiryDate: true, lastAuditDate: true, scopeOfApproval: true,
    },
  });

  const activeTerms = await prisma.$queryRawUnsafe<PaymentTermsRow[]>(`
    SELECT id, net_days, discount_days, discount_percentage, valid_from, valid_to, notes, created_by_id, created_at
    FROM sc_supplier_payment_terms
    WHERE supplier_dolibarr_id = ? AND valid_to IS NULL
    LIMIT 1
  `, dolibarrId);

  const evalCountRows = await prisma.$queryRawUnsafe<[{ cnt: bigint }]>(`
    SELECT COUNT(*) AS cnt FROM sc_supplier_evaluations WHERE dolibarr_id = ?
  `, dolibarrId);

  const s = (v: unknown) => (v == null ? null : String(v));
  const n = (v: unknown) => (v == null ? null : Number(v));

  return {
    dolibarr_id: Number(row.dolibarr_id),
    name: s(row.name) ?? '',
    name_alias: s(row.name_alias),
    code_supplier: s(row.code_supplier),
    email: s(row.email),
    phone: s(row.phone),
    address: s(row.address),
    zip: s(row.zip),
    town: s(row.town),
    country_code: s(row.country_code),
    tva_intra: s(row.tva_intra),
    credit_limit: n(row.credit_limit),
    contacts,
    approved_supplier: approvedSupplier,
    active_payment_terms: activeTerms[0] ? normalizeTermRow(activeTerms[0]) : null,
    coa_ap_account: row.ap_account_code
      ? { account_code: s(row.ap_account_code)!, account_name: s(row.ap_account_name), account_name_ar: s(row.ap_account_name_ar) }
      : null,
    coa_cogs_account: row.cogs_account_code
      ? { account_code: s(row.cogs_account_code)!, account_name: s(row.cogs_account_name), account_name_ar: s(row.cogs_account_name_ar) }
      : null,
    cost_category: s(row.cost_category),
    evaluation_count: Number(evalCountRows[0]?.cnt ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export async function getSupplierInvoices(dolibarrId: number, page: number, limit: number) {
  const offset = (page - 1) * limit;
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT dolibarr_id, ref, ref_supplier, date_invoice, date_due,
           total_ht, total_tva, total_ttc, status, is_paid, fk_projet
    FROM fin_supplier_invoices
    WHERE socid = ? AND is_active = 1
    ORDER BY date_invoice DESC
    LIMIT ? OFFSET ?
  `, dolibarrId, limit, offset);

  const countRows = await prisma.$queryRawUnsafe<[{ cnt: bigint }]>(`
    SELECT COUNT(*) AS cnt FROM fin_supplier_invoices WHERE socid = ? AND is_active = 1
  `, dolibarrId);

  return {
    invoices: rows.map(r => ({
      ...r,
      dolibarr_id: Number(r.dolibarr_id),
      total_ht: Number(r.total_ht),
      total_tva: Number(r.total_tva),
      total_ttc: Number(r.total_ttc),
    })),
    total: Number(countRows[0]?.cnt ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function getSupplierPayments(dolibarrId: number, page: number, limit: number) {
  const offset = (page - 1) * limit;
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT p.id, p.dolibarr_ref, p.amount, p.payment_date, p.payment_method,
           p.invoice_dolibarr_id, si.ref AS invoice_ref, si.ref_supplier
    FROM fin_payments p
    INNER JOIN fin_supplier_invoices si ON si.dolibarr_id = p.invoice_dolibarr_id AND si.is_active = 1
    WHERE p.payment_type = 'supplier' AND si.socid = ?
    ORDER BY p.payment_date DESC
    LIMIT ? OFFSET ?
  `, dolibarrId, limit, offset);

  const countRows = await prisma.$queryRawUnsafe<[{ cnt: bigint }]>(`
    SELECT COUNT(*) AS cnt
    FROM fin_payments p
    INNER JOIN fin_supplier_invoices si ON si.dolibarr_id = p.invoice_dolibarr_id AND si.is_active = 1
    WHERE p.payment_type = 'supplier' AND si.socid = ?
  `, dolibarrId);

  return {
    payments: rows.map(r => ({ ...r, amount: Number(r.amount) })),
    total: Number(countRows[0]?.cnt ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Payment Terms
// ---------------------------------------------------------------------------

function normalizeTermRow(row: Record<string, unknown>): PaymentTermsRow {
  return {
    id: Number(row.id),
    net_days: Number(row.net_days),
    discount_days: row.discount_days != null ? Number(row.discount_days) : null,
    discount_percentage: row.discount_percentage != null ? Number(row.discount_percentage) : null,
    valid_from: row.valid_from instanceof Date
      ? row.valid_from.toISOString().slice(0, 10)
      : String(row.valid_from),
    valid_to: row.valid_to
      ? (row.valid_to instanceof Date ? row.valid_to.toISOString().slice(0, 10) : String(row.valid_to))
      : null,
    notes: row.notes != null ? String(row.notes) : null,
    created_by_id: row.created_by_id != null ? String(row.created_by_id) : null,
    created_at: row.created_at instanceof Date
      ? row.created_at.toISOString()
      : String(row.created_at),
  };
}

export async function getSupplierPaymentTermsHistory(dolibarrId: number): Promise<PaymentTermsRow[]> {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT id, net_days, discount_days, discount_percentage, valid_from, valid_to, notes, created_by_id, created_at
    FROM sc_supplier_payment_terms
    WHERE supplier_dolibarr_id = ?
    ORDER BY valid_from DESC
  `, dolibarrId);
  return rows.map(normalizeTermRow);
}

export async function createSupplierPaymentTerms(
  dolibarrId: number,
  input: CreatePaymentTermsInput,
): Promise<PaymentTermsRow> {
  // Close the currently active term (valid_to IS NULL) the day before valid_from
  const previousDay = new Date(input.valid_from);
  previousDay.setDate(previousDay.getDate() - 1);
  const previousDayStr = previousDay.toISOString().slice(0, 10);

  await prisma.$executeRawUnsafe(`
    UPDATE sc_supplier_payment_terms
    SET valid_to = ?
    WHERE supplier_dolibarr_id = ? AND valid_to IS NULL
  `, previousDayStr, dolibarrId);

  await prisma.$executeRawUnsafe(`
    INSERT INTO sc_supplier_payment_terms
      (supplier_dolibarr_id, net_days, discount_days, discount_percentage, valid_from, valid_to, notes, created_by_id)
    VALUES (?, ?, ?, ?, ?, NULL, ?, ?)
  `,
    dolibarrId,
    input.net_days,
    input.discount_days ?? null,
    input.discount_percentage ?? null,
    input.valid_from,
    input.notes ?? null,
    input.created_by_id,
  );

  const inserted = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT id, net_days, discount_days, discount_percentage, valid_from, valid_to, notes, created_by_id, created_at
    FROM sc_supplier_payment_terms
    WHERE supplier_dolibarr_id = ? AND valid_to IS NULL
    LIMIT 1
  `, dolibarrId);

  return normalizeTermRow(inserted[0]);
}

export async function updateSupplierPaymentTerm(
  termId: number,
  dolibarrId: number,
  input: Partial<CreatePaymentTermsInput & { valid_to: string | null }>,
): Promise<void> {
  const sets: string[] = [];
  const args: unknown[] = [];
  if (input.net_days !== undefined) { sets.push('net_days = ?'); args.push(input.net_days); }
  if (input.discount_days !== undefined) { sets.push('discount_days = ?'); args.push(input.discount_days); }
  if (input.discount_percentage !== undefined) { sets.push('discount_percentage = ?'); args.push(input.discount_percentage); }
  if (input.valid_from !== undefined) { sets.push('valid_from = ?'); args.push(input.valid_from); }
  if ('valid_to' in input) { sets.push('valid_to = ?'); args.push(input.valid_to ?? null); }
  if (input.notes !== undefined) { sets.push('notes = ?'); args.push(input.notes); }
  if (!sets.length) return;
  args.push(termId, dolibarrId);
  await prisma.$executeRawUnsafe(
    `UPDATE sc_supplier_payment_terms SET ${sets.join(', ')} WHERE id = ? AND supplier_dolibarr_id = ?`,
    ...args,
  );
}

// ---------------------------------------------------------------------------
// Evaluations
// ---------------------------------------------------------------------------

export async function getSupplierEvaluations(dolibarrId: number): Promise<EvaluationRow[]> {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT
      e.id, e.dolibarr_id, e.evaluation_date, e.evaluation_period,
      e.score_quality, e.score_delivery, e.score_price,
      e.score_service, e.score_documentation, e.score_hse,
      e.weighted_score, e.rating, e.outcome,
      e.notes_quality, e.notes_delivery, e.notes_price,
      e.notes_service, e.notes_documentation, e.notes_hse,
      e.general_notes, e.evaluator_id, e.created_by_id, e.created_at,
      ev.name AS evaluator_name,
      cb.name AS created_by_name
    FROM sc_supplier_evaluations e
    LEFT JOIN User ev ON ev.id = e.evaluator_id
    LEFT JOIN User cb ON cb.id = e.created_by_id
    WHERE e.dolibarr_id = ?
    ORDER BY e.evaluation_date DESC
  `, dolibarrId);

  const s = (v: unknown) => (v == null ? null : String(v));
  return rows.map(r => ({
    id: s(r.id)!,
    dolibarr_id: Number(r.dolibarr_id),
    evaluation_date: r.evaluation_date instanceof Date
      ? r.evaluation_date.toISOString().slice(0, 10)
      : String(r.evaluation_date),
    evaluation_period: s(r.evaluation_period),
    score_quality: Number(r.score_quality),
    score_delivery: Number(r.score_delivery),
    score_price: Number(r.score_price),
    score_service: Number(r.score_service),
    score_documentation: Number(r.score_documentation),
    score_hse: Number(r.score_hse),
    weighted_score: Number(r.weighted_score),
    rating: s(r.rating)!,
    outcome: s(r.outcome)!,
    notes_quality: s(r.notes_quality),
    notes_delivery: s(r.notes_delivery),
    notes_price: s(r.notes_price),
    notes_service: s(r.notes_service),
    notes_documentation: s(r.notes_documentation),
    notes_hse: s(r.notes_hse),
    general_notes: s(r.general_notes),
    evaluator_id: s(r.evaluator_id),
    evaluator_name: s(r.evaluator_name),
    created_by_id: s(r.created_by_id),
    created_by_name: s(r.created_by_name),
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }));
}

export async function createEvaluation(
  dolibarrId: number,
  input: CreateEvaluationInput,
  supplierName: string,
): Promise<EvaluationRow> {
  const weighted = computeWeightedScore({
    quality: input.score_quality,
    delivery: input.score_delivery,
    price: input.score_price,
    service: input.score_service,
    documentation: input.score_documentation,
    hse: input.score_hse,
  });
  const rating = scoreToRating(weighted);
  const outcome = ratingToOutcome(rating);
  const id = uuidv4();

  await prisma.$executeRawUnsafe(`
    INSERT INTO sc_supplier_evaluations (
      id, dolibarr_id, evaluation_date, evaluation_period,
      score_quality, score_delivery, score_price, score_service, score_documentation, score_hse,
      weighted_score, rating, outcome,
      notes_quality, notes_delivery, notes_price, notes_service, notes_documentation, notes_hse,
      general_notes, evaluator_id, created_by_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    id, dolibarrId, input.evaluation_date, input.evaluation_period ?? null,
    input.score_quality, input.score_delivery, input.score_price,
    input.score_service, input.score_documentation, input.score_hse,
    weighted, rating, outcome,
    input.notes_quality ?? null, input.notes_delivery ?? null, input.notes_price ?? null,
    input.notes_service ?? null, input.notes_documentation ?? null, input.notes_hse ?? null,
    input.general_notes ?? null, input.evaluator_id ?? null, input.created_by_id,
  );

  if (outcome !== 'REJECTED') {
    await upsertApprovedSupplierFromEvaluation(
      dolibarrId, supplierName, rating, outcome, input.evaluation_date,
    );
  }

  logger.info({ dolibarrId, rating, outcome, weighted }, 'Supplier evaluation created');

  const rows = await getSupplierEvaluations(dolibarrId);
  return rows.find(r => r.id === id)!;
}

async function upsertApprovedSupplierFromEvaluation(
  dolibarrId: number,
  supplierName: string,
  rating: string,
  outcome: string,
  evaluationDate: string,
): Promise<void> {
  // Get supplier code from Dolibarr
  const codeRows = await prisma.$queryRawUnsafe<[{ code_supplier: string | null }]>(`
    SELECT code_supplier FROM dolibarr_thirdparties WHERE dolibarr_id = ?
  `, dolibarrId);
  const codeSupplier = codeRows[0]?.code_supplier ?? null;

  // Determine supplierCode — prefer Dolibarr code, fall back to SUP-NNN pattern
  let supplierCode = codeSupplier;
  if (!supplierCode) {
    const last = await prisma.scApprovedSupplier.findFirst({
      where: { supplierCode: { startsWith: 'SUP-' } },
      orderBy: { supplierCode: 'desc' },
      select: { supplierCode: true },
    });
    const n = last ? (parseInt(last.supplierCode.replace('SUP-', '')) || 0) + 1 : 1;
    supplierCode = `SUP-${String(n).padStart(3, '0')}`;
  }

  const approvalStatus =
    outcome === 'APPROVED' ? 'APPROVED' :
    outcome === 'CONDITIONAL' ? 'CONDITIONAL' :
    'SUSPENDED';

  // Check if a record already exists for this dolibarr_id
  const existing = await prisma.scApprovedSupplier.findFirst({
    where: { dolibarrId, deletedAt: null },
    select: { id: true },
  });

  if (existing) {
    await prisma.scApprovedSupplier.update({
      where: { id: existing.id },
      data: {
        approvalStatus,
        rating,
        lastAuditDate: new Date(evaluationDate),
        updatedAt: new Date(),
      },
    });
  } else {
    await prisma.scApprovedSupplier.create({
      data: {
        dolibarrId,
        supplierCode,
        name: supplierName,
        approvalStatus,
        rating,
        lastAuditDate: new Date(evaluationDate),
        approvalDate: new Date(evaluationDate),
        updatedAt: new Date(),
      },
    });
  }
}

// ---------------------------------------------------------------------------
// CoA (AP + COGS)
// ---------------------------------------------------------------------------

export async function getSupplierCoaMapping(dolibarrId: number) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT
      coa_ap.coa_account_code AS ap_account_code,
      ap_def.account_name     AS ap_account_name,
      ap_def.account_name_ar  AS ap_account_name_ar,
      sc.cost_category,
      sc.coa_account_code     AS cogs_account_code,
      cogs_def.account_name   AS cogs_account_name,
      cogs_def.account_name_ar AS cogs_account_name_ar
    FROM (SELECT ? AS supplier_id) src
    LEFT JOIN fin_supplier_coa_default coa_ap ON coa_ap.supplier_dolibarr_id = src.supplier_id
    LEFT JOIN fin_chart_of_accounts ap_def ON ap_def.account_code = coa_ap.coa_account_code
    LEFT JOIN fin_supplier_classification sc ON sc.supplier_id = src.supplier_id
    LEFT JOIN fin_chart_of_accounts cogs_def ON cogs_def.account_code = sc.coa_account_code
  `, dolibarrId);

  const row = rows[0] ?? {};
  const s = (v: unknown) => (v == null ? null : String(v));
  return {
    ap: row.ap_account_code
      ? { code: s(row.ap_account_code), name: s(row.ap_account_name), name_ar: s(row.ap_account_name_ar) }
      : null,
    cogs: row.cogs_account_code
      ? { code: s(row.cogs_account_code), name: s(row.cogs_account_name), name_ar: s(row.cogs_account_name_ar) }
      : null,
    cost_category: s(row.cost_category),
  };
}

// ---------------------------------------------------------------------------
// Credit Limit History
// ---------------------------------------------------------------------------

export interface CreditLimitRow {
  id: number;
  credit_limit: number;
  valid_from: string;
  valid_to: string | null;
  notes: string | null;
  created_by_id: string | null;
  created_at: string;
}

export interface CreateCreditLimitInput {
  credit_limit: number;
  valid_from: string;
  notes?: string;
  created_by_id: string;
}

function normalizeCreditRow(row: Record<string, unknown>): CreditLimitRow {
  return {
    id: Number(row.id),
    credit_limit: Number(row.credit_limit),
    valid_from: String(row.valid_from).slice(0, 10),
    valid_to: row.valid_to ? String(row.valid_to).slice(0, 10) : null,
    notes: row.notes != null ? String(row.notes) : null,
    created_by_id: row.created_by_id != null ? String(row.created_by_id) : null,
    created_at: String(row.created_at),
  };
}

export async function getSupplierCreditLimitHistory(dolibarrId: number): Promise<CreditLimitRow[]> {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT id, credit_limit, valid_from, valid_to, notes, created_by_id, created_at
    FROM sc_supplier_credit_limit_history
    WHERE supplier_dolibarr_id = ?
    ORDER BY valid_from DESC
  `, dolibarrId);
  return rows.map(normalizeCreditRow);
}

export async function createSupplierCreditLimit(
  dolibarrId: number,
  input: CreateCreditLimitInput,
): Promise<CreditLimitRow> {
  const previousDay = new Date(input.valid_from);
  previousDay.setDate(previousDay.getDate() - 1);
  const prevDayStr = previousDay.toISOString().slice(0, 10);

  await prisma.$executeRawUnsafe(`
    UPDATE sc_supplier_credit_limit_history
    SET valid_to = ?
    WHERE supplier_dolibarr_id = ? AND valid_to IS NULL
  `, prevDayStr, dolibarrId);

  await prisma.$executeRawUnsafe(`
    INSERT INTO sc_supplier_credit_limit_history
      (supplier_dolibarr_id, credit_limit, valid_from, valid_to, notes, created_by_id)
    VALUES (?, ?, ?, NULL, ?, ?)
  `,
    dolibarrId,
    input.credit_limit,
    input.valid_from,
    input.notes ?? null,
    input.created_by_id,
  );

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT id, credit_limit, valid_from, valid_to, notes, created_by_id, created_at
    FROM sc_supplier_credit_limit_history
    WHERE supplier_dolibarr_id = ? AND valid_to IS NULL
    LIMIT 1
  `, dolibarrId);

  return normalizeCreditRow(rows[0]);
}
