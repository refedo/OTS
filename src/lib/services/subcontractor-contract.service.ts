/**
 * Subcontractor Contract Service
 * Server-only — imports prisma and logger.
 * Client-safe constants are in subcontractor-contract.constants.ts
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { SCOPE_CODES } from './subcontractor-contract.constants';

// Re-export client-safe constants for convenience
export {
  SCOPE_CODES,
  SCOPE_LABELS,
  TEMPLATE_LABELS,
  getDefaultTerms,
} from './subcontractor-contract.constants';

// ─── Status flow ──────────────────────────────────────────────────────────────

export const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['APPROVED', 'DRAFT', 'CANCELLED'],
  APPROVED: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['SUSPENDED', 'COMPLETED', 'CANCELLED'],
  SUSPENDED: ['ACTIVE', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

// ─── Contract number generation ───────────────────────────────────────────────

function buildContractBase(
  projectNumber: string,
  buildingDesignation: string | null,
  scopeTypes: string[]
): string {
  const codes = scopeTypes.map(t => SCOPE_CODES[t] ?? 'OTH');
  const scopePart = codes.length === 1 ? codes[0] : codes.length > 1 ? 'MUL' : 'ALL';
  if (buildingDesignation) {
    return `${projectNumber}-${buildingDesignation.toUpperCase()}-${scopePart}`;
  }
  return `${projectNumber}-${scopePart}`;
}

export async function generateContractNumber(
  projectNumber: string,
  buildingDesignation: string | null,
  scopeTypes: string[]
): Promise<string> {
  const base = buildContractBase(projectNumber, buildingDesignation, scopeTypes);
  const existing = await prisma.subcontractorContract.count({
    where: { contractNumber: { startsWith: base } },
  });
  if (existing === 0) return base;
  return `${base}-${existing + 1}`;
}

export function generateCertificateNumber(contractNumber: string, sequence: number): string {
  return `PC-${contractNumber}-${String(sequence).padStart(3, '0')}`;
}

// ─── Certificate cumulative calculation ──────────────────────────────────────

export async function getLastCertificateTotals(contractId: string): Promise<{
  cumulativePercentage: number;
  cumulativeAmount: number;
}> {
  const last = await prisma.subcontractorPaymentCertificate.findFirst({
    where: { contractId, deletedAt: null, status: { not: 'CANCELLED' } },
    orderBy: { createdAt: 'desc' },
    select: { cumulativePercentage: true, cumulativeAmount: true },
  });
  return {
    cumulativePercentage: last ? Number(last.cumulativePercentage) : 0,
    cumulativeAmount: last ? Number(last.cumulativeAmount) : 0,
  };
}

export async function getNextCertSequence(contractId: string): Promise<number> {
  const count = await prisma.subcontractorPaymentCertificate.count({
    where: { contractId, deletedAt: null },
  });
  return count + 1;
}

// ─── Dashboard aggregates ─────────────────────────────────────────────────────

export async function getDashboardStats() {
  const contracts = await prisma.subcontractorContract.findMany({
    where: { deletedAt: null },
    select: {
      status: true,
      contractValue: true,
      paymentCertificates: {
        where: { deletedAt: null },
        select: { paidAmount: true, netAmountDue: true, status: true },
      },
    },
  });

  const totalContracts = contracts.length;
  const byStatus = contracts.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  const totalValue = contracts.reduce((sum, c) => sum + Number(c.contractValue), 0);
  const totalPaid = contracts.flatMap(c => c.paymentCertificates)
    .filter(cert => cert.status === 'PAID')
    .reduce((sum, cert) => sum + Number(cert.paidAmount), 0);
  const totalOutstanding = contracts.flatMap(c => c.paymentCertificates)
    .filter(cert => cert.status === 'APPROVED')
    .reduce((sum, cert) => sum + Number(cert.netAmountDue), 0);

  return { totalContracts, byStatus, totalValue, totalPaid, totalOutstanding };
}

logger.info({}, '[SubcontractorContractService] Service module loaded');
