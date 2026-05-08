import prisma from '@/lib/db';

export interface CustomerListRow {
  dolibarr_id: number;
  name: string;
  code_client: string | null;
  email: string | null;
  phone: string | null;
  town: string | null;
  country_code: string | null;
  is_active: number;
  client_type: number;
}

export interface CustomerContact {
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  phone_pro: string | null;
  phone_mobile: string | null;
  poste: string | null;
}

export interface CustomerPaymentTermsRow {
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

export interface CustomerOverview {
  dolibarr_id: number;
  name: string;
  name_alias: string | null;
  code_client: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  zip: string | null;
  town: string | null;
  country_code: string | null;
  tva_intra: string | null;
  credit_limit: number | null;
  contacts: CustomerContact[];
  active_payment_terms: CustomerPaymentTermsRow | null;
}

export interface CreateCustomerPaymentTermsInput {
  net_days: number;
  discount_days?: number;
  discount_percentage?: number;
  valid_from: string;
  notes?: string;
  created_by_id: string;
}

// ---------------------------------------------------------------------------
// Customer List
// ---------------------------------------------------------------------------

export async function getCustomerList(
  search: string | null,
  page: number,
  limit: number,
): Promise<{ customers: CustomerListRow[]; total: number }> {
  const offset = (page - 1) * limit;
  const searchFilter = search ? `AND dt.name LIKE ?` : '';
  const searchArgs = search ? [`%${search}%`] : [];

  const rows = await prisma.$queryRawUnsafe<CustomerListRow[]>(`
    SELECT
      dt.dolibarr_id, dt.name, dt.code_client, dt.email, dt.phone,
      dt.town, dt.country_code, dt.is_active, dt.client_type
    FROM dolibarr_thirdparties dt
    WHERE dt.client_type IN (1, 3) AND dt.is_active = 1 ${searchFilter}
    ORDER BY dt.name ASC
    LIMIT ? OFFSET ?
  `, ...searchArgs, limit, offset);

  const countRows = await prisma.$queryRawUnsafe<[{ cnt: bigint }]>(`
    SELECT COUNT(*) AS cnt
    FROM dolibarr_thirdparties dt
    WHERE dt.client_type IN (1, 3) AND dt.is_active = 1 ${searchFilter}
  `, ...searchArgs);

  return {
    customers: rows.map(r => ({ ...r, dolibarr_id: Number(r.dolibarr_id) })),
    total: Number(countRows[0]?.cnt ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Customer Overview
// ---------------------------------------------------------------------------

export async function getCustomerOverview(dolibarrId: number): Promise<CustomerOverview | null> {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT
      dt.dolibarr_id, dt.name, dt.name_alias, dt.code_client,
      dt.email, dt.phone, dt.address, dt.zip, dt.town, dt.country_code,
      dt.tva_intra, dt.outstanding_limit AS credit_limit
    FROM dolibarr_thirdparties dt
    WHERE dt.dolibarr_id = ? AND dt.client_type IN (1, 3)
  `, dolibarrId);

  if (!rows.length) return null;
  const row = rows[0];

  const contacts = await prisma.$queryRawUnsafe<CustomerContact[]>(`
    SELECT firstname, lastname, email, phone_pro, phone_mobile, poste
    FROM dolibarr_contacts
    WHERE dolibarr_thirdparty_id = ? AND statut = 1
    ORDER BY lastname, firstname
  `, dolibarrId);

  const activeTerms = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT id, net_days, discount_days, discount_percentage, valid_from, valid_to, notes, created_by_id, created_at
    FROM sc_customer_payment_terms
    WHERE customer_dolibarr_id = ? AND valid_to IS NULL
    LIMIT 1
  `, dolibarrId);

  const s = (v: unknown) => (v == null ? null : String(v));
  return {
    dolibarr_id: Number(row.dolibarr_id),
    name: s(row.name) ?? '',
    name_alias: s(row.name_alias),
    code_client: s(row.code_client),
    email: s(row.email),
    phone: s(row.phone),
    address: s(row.address),
    zip: s(row.zip),
    town: s(row.town),
    country_code: s(row.country_code),
    tva_intra: s(row.tva_intra),
    credit_limit: row.credit_limit != null ? Number(row.credit_limit) : null,
    contacts,
    active_payment_terms: activeTerms[0] ? normalizeTermRow(activeTerms[0]) : null,
  };
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export async function getCustomerInvoices(dolibarrId: number, page: number, limit: number) {
  const offset = (page - 1) * limit;
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT dolibarr_id, ref, ref_client, date_invoice, date_due,
           total_ht, total_tva, total_ttc, status, is_paid
    FROM fin_customer_invoices
    WHERE socid = ? AND is_active = 1
    ORDER BY date_invoice DESC
    LIMIT ? OFFSET ?
  `, dolibarrId, limit, offset);

  const countRows = await prisma.$queryRawUnsafe<[{ cnt: bigint }]>(`
    SELECT COUNT(*) AS cnt FROM fin_customer_invoices WHERE socid = ? AND is_active = 1
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

export async function getCustomerPayments(dolibarrId: number, page: number, limit: number) {
  const offset = (page - 1) * limit;
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT p.id, p.dolibarr_ref, p.amount, p.payment_date, p.payment_method,
           p.invoice_dolibarr_id, ci.ref AS invoice_ref, ci.ref_client
    FROM fin_payments p
    INNER JOIN fin_customer_invoices ci ON ci.dolibarr_id = p.invoice_dolibarr_id AND ci.is_active = 1
    WHERE p.payment_type = 'customer' AND ci.socid = ?
    ORDER BY p.payment_date DESC
    LIMIT ? OFFSET ?
  `, dolibarrId, limit, offset);

  const countRows = await prisma.$queryRawUnsafe<[{ cnt: bigint }]>(`
    SELECT COUNT(*) AS cnt
    FROM fin_payments p
    INNER JOIN fin_customer_invoices ci ON ci.dolibarr_id = p.invoice_dolibarr_id AND ci.is_active = 1
    WHERE p.payment_type = 'customer' AND ci.socid = ?
  `, dolibarrId);

  return {
    payments: rows.map(r => ({ ...r, amount: Number(r.amount) })),
    total: Number(countRows[0]?.cnt ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Payment Terms
// ---------------------------------------------------------------------------

function normalizeTermRow(row: Record<string, unknown>): CustomerPaymentTermsRow {
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

export async function getCustomerPaymentTermsHistory(dolibarrId: number): Promise<CustomerPaymentTermsRow[]> {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT id, net_days, discount_days, discount_percentage, valid_from, valid_to, notes, created_by_id, created_at
    FROM sc_customer_payment_terms
    WHERE customer_dolibarr_id = ?
    ORDER BY valid_from DESC
  `, dolibarrId);
  return rows.map(normalizeTermRow);
}

export async function createCustomerPaymentTerms(
  dolibarrId: number,
  input: CreateCustomerPaymentTermsInput,
): Promise<CustomerPaymentTermsRow> {
  const previousDay = new Date(input.valid_from);
  previousDay.setDate(previousDay.getDate() - 1);
  const previousDayStr = previousDay.toISOString().slice(0, 10);

  await prisma.$executeRawUnsafe(`
    UPDATE sc_customer_payment_terms
    SET valid_to = ?
    WHERE customer_dolibarr_id = ? AND valid_to IS NULL
  `, previousDayStr, dolibarrId);

  await prisma.$executeRawUnsafe(`
    INSERT INTO sc_customer_payment_terms
      (customer_dolibarr_id, net_days, discount_days, discount_percentage, valid_from, valid_to, notes, created_by_id)
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
    FROM sc_customer_payment_terms
    WHERE customer_dolibarr_id = ? AND valid_to IS NULL
    LIMIT 1
  `, dolibarrId);

  return normalizeTermRow(inserted[0]);
}

// ---------------------------------------------------------------------------
// Projects (direct dolibarr_id link preferred, falls back to name match)
// ---------------------------------------------------------------------------

export async function getCustomerProjects(dolibarrId: number) {
  const nameRows = await prisma.$queryRawUnsafe<[{ name: string }]>(`
    SELECT name FROM dolibarr_thirdparties WHERE dolibarr_id = ? LIMIT 1
  `, dolibarrId);
  if (!nameRows.length) return { projects: [], matched: false, linkType: null as string | null };

  const thirdpartyName = nameRows[0].name;

  // Prefer direct dolibarr_id link; fall back to fuzzy name match
  let client = await prisma.client.findFirst({
    where: { dolibarrId },
    select: { id: true, name: true },
  });
  const linkType = client ? 'direct' : 'name';

  if (!client) {
    client = await prisma.client.findFirst({
      where: { name: { contains: thirdpartyName } },
      select: { id: true, name: true },
    });
  }

  if (!client) return { projects: [], matched: false, linkType: null };

  const projects = await prisma.project.findMany({
    where: { clientId: client.id, deletedAt: null },
    select: {
      id: true,
      projectNumber: true,
      name: true,
      status: true,
      contractValue: true,
      contractDate: true,
      plannedStartDate: true,
      plannedEndDate: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return { projects, matched: true, clientName: client.name, clientId: client.id, thirdpartyName, linkType };
}

export async function linkClientToDolibarrCustomer(clientId: string, dolibarrId: number) {
  await prisma.client.update({
    where: { id: clientId },
    data: { dolibarrId },
  });
}

export async function getClientsForLinking(search: string) {
  return prisma.client.findMany({
    where: search ? { name: { contains: search } } : {},
    select: { id: true, name: true, dolibarrId: true },
    orderBy: { name: 'asc' },
    take: 20,
  });
}

// ---------------------------------------------------------------------------
// Credit Limit History
// ---------------------------------------------------------------------------

export interface CustomerCreditLimitRow {
  id: number;
  credit_limit: number;
  valid_from: string;
  valid_to: string | null;
  notes: string | null;
  created_by_id: string | null;
  created_at: string;
}

export interface CreateCustomerCreditLimitInput {
  credit_limit: number;
  valid_from: string;
  notes?: string;
  created_by_id: string;
}

function normalizeCreditRow(row: Record<string, unknown>): CustomerCreditLimitRow {
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

export async function getCustomerCreditLimitHistory(dolibarrId: number): Promise<CustomerCreditLimitRow[]> {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT id, credit_limit, valid_from, valid_to, notes, created_by_id, created_at
    FROM sc_customer_credit_limit_history
    WHERE customer_dolibarr_id = ?
    ORDER BY valid_from DESC
  `, dolibarrId);
  return rows.map(normalizeCreditRow);
}

export async function createCustomerCreditLimit(
  dolibarrId: number,
  input: CreateCustomerCreditLimitInput,
): Promise<CustomerCreditLimitRow> {
  const previousDay = new Date(input.valid_from);
  previousDay.setDate(previousDay.getDate() - 1);
  const prevDayStr = previousDay.toISOString().slice(0, 10);

  await prisma.$executeRawUnsafe(`
    UPDATE sc_customer_credit_limit_history
    SET valid_to = ?
    WHERE customer_dolibarr_id = ? AND valid_to IS NULL
  `, prevDayStr, dolibarrId);

  await prisma.$executeRawUnsafe(`
    INSERT INTO sc_customer_credit_limit_history
      (customer_dolibarr_id, credit_limit, valid_from, valid_to, notes, created_by_id)
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
    FROM sc_customer_credit_limit_history
    WHERE customer_dolibarr_id = ? AND valid_to IS NULL
    LIMIT 1
  `, dolibarrId);

  return normalizeCreditRow(rows[0]);
}
