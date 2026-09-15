import { prisma } from '@futurenostics/db';
import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/** MC-YYYY-NNNNN — sequential per calendar year. */
export async function allocateOpdClaimNumber(client: Tx | typeof prisma = prisma): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `MC-${year}-`;
  const latest = await client.opdClaim.findFirst({
    where: { claimNumber: { startsWith: prefix } },
    orderBy: { claimNumber: 'desc' },
    select: { claimNumber: true },
  });
  const next = latest ? Number.parseInt(latest.claimNumber.slice(-5), 10) + 1 : 1;
  return `${prefix}${String(next).padStart(5, '0')}`;
}
