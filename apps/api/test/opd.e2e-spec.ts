import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { prisma } from '@futurenostics/db';
import { AppModule } from '../src/app.module';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

/**
 * OPD claim lifecycle: employee create → upload prescription → submit
 * → Finance approve / reject, plus hard SoD (submitter cannot approve).
 */
describe('OPD claims (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let maryamToken: string;
  let financeToken: string | null = null;
  const createdClaimIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api', { exclude: ['health'] });
    await app.init();

    const seedEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@futurenostics.local';
    const seedPwd = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!Now123';

    const admin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: seedEmail, password: seedPwd });
    adminToken = admin.body.accessToken;

    const maryam = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'maryam.iqbal@futurenostics.local', password: seedPwd });
    maryamToken = maryam.body.accessToken;

    const finance = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'hassan.riaz@futurenostics.local', password: seedPwd });
    if (finance.status === 200) {
      financeToken = finance.body.accessToken;
    }
  });

  afterAll(async () => {
    if (createdClaimIds.length > 0) {
      await prisma.approval.deleteMany({
        where: { type: 'opd-claim', sourceId: { in: createdClaimIds } },
      });
      await prisma.opdClaim.deleteMany({ where: { id: { in: createdClaimIds } } });
    }
    await app?.close();
  });

  async function createUploadedClaim(token: string, amount = 2500) {
    const created = await request(app.getHttpServer())
      .post('/api/opd/claims')
      .set('Authorization', `Bearer ${token}`)
      .send({
        medicineCostPkr: amount,
        claimedAmountPkr: amount,
        visitDate: '2026-09-01',
        notes: 'e2e claim',
      });
    expect(created.status).toBe(201);
    expect(created.body.claimNumber).toMatch(/^MC-\d{4}-\d{5}$/);
    expect(created.body.category).toBe('doctor_consultation');
    createdClaimIds.push(created.body.id);

    const upload = await request(app.getHttpServer())
      .post(`/api/opd/claims/${created.body.id}/prescription`)
      .set('Authorization', `Bearer ${token}`)
      .attach('prescription', PNG_1X1, { filename: 'rx.png', contentType: 'image/png' });
    expect(upload.status).toBe(201);

    return created.body.id as string;
  }

  it('employee cannot submit without a prescription', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/opd/claims')
      .set('Authorization', `Bearer ${maryamToken}`)
      .send({ medicineCostPkr: 1000, claimedAmountPkr: 1000 });
    expect(created.status).toBe(201);
    createdClaimIds.push(created.body.id);

    const submitted = await request(app.getHttpServer())
      .post(`/api/opd/claims/${created.body.id}/submit`)
      .set('Authorization', `Bearer ${maryamToken}`);
    expect(submitted.status).toBe(400);
  });

  it('employee submits; finance approves via Approvals', async () => {
    const id = await createUploadedClaim(maryamToken, 3200);

    const submitted = await request(app.getHttpServer())
      .post(`/api/opd/claims/${id}/submit`)
      .set('Authorization', `Bearer ${maryamToken}`);
    expect(submitted.status).toBe(200);
    expect(submitted.body.status).toBe('pending_approval');

    const employeeApprove = await request(app.getHttpServer())
      .get('/api/approvals?status=pending&type=opd-claim')
      .set('Authorization', `Bearer ${maryamToken}`);
    expect(employeeApprove.status).toBe(403);

    const approverToken = financeToken ?? adminToken;
    const inbox = await request(app.getHttpServer())
      .get('/api/approvals?status=pending&type=opd-claim&for=me&limit=100')
      .set('Authorization', `Bearer ${approverToken}`);
    expect(inbox.status).toBe(200);
    const row = inbox.body.items.find((item: { sourceId: string }) => item.sourceId === id);
    expect(row).toBeTruthy();

    const approved = await request(app.getHttpServer())
      .post(`/api/approvals/${row.id}/approve`)
      .set('Authorization', `Bearer ${approverToken}`)
      .send({});
    expect(approved.status).toBe(200);

    const fresh = await request(app.getHttpServer())
      .get(`/api/opd/claims/${id}`)
      .set('Authorization', `Bearer ${maryamToken}`);
    expect(fresh.status).toBe(200);
    expect(fresh.body.status).toBe('approved');
  });

  it('finance can reject with a reason', async () => {
    const id = await createUploadedClaim(maryamToken, 1800);
    await request(app.getHttpServer())
      .post(`/api/opd/claims/${id}/submit`)
      .set('Authorization', `Bearer ${maryamToken}`)
      .expect(200);

    const approverToken = financeToken ?? adminToken;
    const inbox = await request(app.getHttpServer())
      .get('/api/approvals?status=pending&type=opd-claim&for=me&limit=100')
      .set('Authorization', `Bearer ${approverToken}`);
    const row = inbox.body.items.find((item: { sourceId: string }) => item.sourceId === id);

    await request(app.getHttpServer())
      .post(`/api/approvals/${row.id}/reject`)
      .set('Authorization', `Bearer ${approverToken}`)
      .send({ reason: 'Prescription is unreadable' })
      .expect(200);

    const fresh = await request(app.getHttpServer())
      .get(`/api/opd/claims/${id}`)
      .set('Authorization', `Bearer ${maryamToken}`);
    expect(fresh.body.status).toBe('rejected');
    expect(fresh.body.rejectionReason).toBe('Prescription is unreadable');
  });

  it('submitter cannot approve their own claim (hard SoD)', async () => {
    const token = financeToken ?? adminToken;
    if (!financeToken) {
      // Super-admin has no employeeId, so they cannot create a claim.
      // Skip the create-as-approver path and assert Maryam cannot hit approve.
      const id = await createUploadedClaim(maryamToken, 1000);
      await request(app.getHttpServer())
        .post(`/api/opd/claims/${id}/submit`)
        .set('Authorization', `Bearer ${maryamToken}`)
        .expect(200);
      const inbox = await request(app.getHttpServer())
        .get('/api/approvals?status=pending&type=opd-claim&for=all&limit=100')
        .set('Authorization', `Bearer ${adminToken}`);
      const row = inbox.body.items.find((item: { sourceId: string }) => item.sourceId === id);
      const blocked = await request(app.getHttpServer())
        .post(`/api/approvals/${row.id}/approve`)
        .set('Authorization', `Bearer ${maryamToken}`)
        .send({});
      expect(blocked.status).toBe(403);
      return;
    }

    const id = await createUploadedClaim(token, 2100);
    await request(app.getHttpServer())
      .post(`/api/opd/claims/${id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const inbox = await request(app.getHttpServer())
      .get('/api/approvals?status=pending&type=opd-claim&for=me&limit=100')
      .set('Authorization', `Bearer ${token}`);
    const row = inbox.body.items.find((item: { sourceId: string }) => item.sourceId === id);
    expect(row).toBeTruthy();

    const blocked = await request(app.getHttpServer())
      .post(`/api/approvals/${row.id}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(blocked.status).toBe(403);
    expect(String(blocked.body.message ?? '')).toMatch(/separation of duties/i);
  });

  it('finance can return for correction; employee resubmits', async () => {
    const id = await createUploadedClaim(maryamToken, 1500);
    await request(app.getHttpServer())
      .post(`/api/opd/claims/${id}/submit`)
      .set('Authorization', `Bearer ${maryamToken}`)
      .expect(200);

    const approverToken = financeToken ?? adminToken;
    const returned = await request(app.getHttpServer())
      .post(`/api/opd/claims/${id}/return-for-correction`)
      .set('Authorization', `Bearer ${approverToken}`)
      .send({ reasonCode: 'missing_document', comment: 'Need itemised bill' })
      .expect(200);
    expect(returned.body.status).toBe('returned');

    const resubmit = await request(app.getHttpServer())
      .post(`/api/opd/claims/${id}/submit`)
      .set('Authorization', `Bearer ${maryamToken}`)
      .expect(200);
    expect(resubmit.body.status).toBe('pending_approval');
  });

  it('finance reject with structured reason code', async () => {
    const id = await createUploadedClaim(maryamToken, 1600);
    await request(app.getHttpServer())
      .post(`/api/opd/claims/${id}/submit`)
      .set('Authorization', `Bearer ${maryamToken}`)
      .expect(200);

    const approverToken = financeToken ?? adminToken;
    const inbox = await request(app.getHttpServer())
      .get('/api/approvals?status=pending&type=opd-claim&for=me&limit=100')
      .set('Authorization', `Bearer ${approverToken}`);
    const row = inbox.body.items.find((item: { sourceId: string }) => item.sourceId === id);

    await request(app.getHttpServer())
      .post(`/api/approvals/${row.id}/reject`)
      .set('Authorization', `Bearer ${approverToken}`)
      .send({
        reason: 'Outside policy — Not covered',
        reasonCode: 'outside_policy',
        comment: 'Not covered',
      })
      .expect(200);

    const fresh = await request(app.getHttpServer())
      .get(`/api/opd/claims/${id}`)
      .set('Authorization', `Bearer ${maryamToken}`);
    expect(fresh.body.status).toBe('rejected');
    expect(fresh.body.rejectionReasonCode).toBe('outside_policy');
    expect(fresh.body.history?.length).toBeGreaterThan(0);
  });

  it('bill amount must be at least 1000 PKR', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/opd/claims')
      .set('Authorization', `Bearer ${maryamToken}`)
      .send({ medicineCostPkr: 999, claimedAmountPkr: 999 });
    expect(res.status).toBe(400);
  });

  it('claimed amount cannot exceed medicine cost', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/opd/claims')
      .set('Authorization', `Bearer ${maryamToken}`)
      .send({ medicineCostPkr: 2000, claimedAmountPkr: 2500 });
    expect(res.status).toBe(400);
  });
});
