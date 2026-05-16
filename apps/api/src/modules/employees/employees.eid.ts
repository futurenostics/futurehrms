/**
 * Employee ID (`EID`) generator.
 *
 * Format: `EMP-NNNN` zero-padded to 4 digits (`EMP-0001`, `EMP-0042`).
 * The counter increments from the highest existing EID at the moment
 * of the call; gaps (from deleted rows) are not reused. When we cross
 * EMP-9999 we'll need to widen to 5 digits — flagged with a runtime
 * error so we don't silently wrap.
 */
import { prisma } from '@futurenostics/db';

const PREFIX = 'EMP-';
const PAD_WIDTH = 4;

export async function nextEid(): Promise<string> {
  const latest = await prisma.employee.findFirst({
    where: { eid: { startsWith: PREFIX } },
    orderBy: { eid: 'desc' },
    select: { eid: true },
  });

  let nextNumber = 1;
  if (latest) {
    const trailing = latest.eid.slice(PREFIX.length);
    const parsed = Number.parseInt(trailing, 10);
    if (Number.isFinite(parsed)) {
      nextNumber = parsed + 1;
    }
  }

  if (nextNumber >= 10 ** PAD_WIDTH) {
    throw new Error(
      `EID counter exceeded ${'9'.repeat(PAD_WIDTH)} — widen PAD_WIDTH in employees.eid.ts`,
    );
  }

  return `${PREFIX}${String(nextNumber).padStart(PAD_WIDTH, '0')}`;
}
