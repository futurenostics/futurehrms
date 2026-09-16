import { prisma } from '@futurenostics/db';
import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/** EX-YYYY-NNNNN — sequential per calendar year. */
export async function allocateExpenseClaimNumber(
  client: Tx | typeof prisma = prisma,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `EX-${year}-`;
  const latest = await client.expenseClaim.findFirst({
    where: { claimNumber: { startsWith: prefix } },
    orderBy: { claimNumber: 'desc' },
    select: { claimNumber: true },
  });
  const next = latest ? Number.parseInt(latest.claimNumber.slice(-5), 10) + 1 : 1;
  return `${prefix}${String(next).padStart(5, '0')}`;
}
