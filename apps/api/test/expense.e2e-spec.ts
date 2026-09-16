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

describe('Expense claims (e2e)', () => {
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
        where: { type: 'expense-claim', sourceId: { in: createdClaimIds } },
      });
      await prisma.expenseClaim.deleteMany({ where: { id: { in: createdClaimIds } } });
    }
    await app?.close();
  });

  async function createUploadedClaim(
    token: string,
    body: Record<string, unknown>,
  ): Promise<string> {
    const created = await request(app.getHttpServer())
      .post('/api/expenses/claims')
      .set('Authorization', `Bearer ${token}`)
      .send(body);
    expect(created.status).toBe(201);
    expect(created.body.claimNumber).toMatch(/^EX-\d{4}-\d{5}$/);
    expect(created.body.currency).toBe('PKR');
    createdClaimIds.push(created.body.id);

    const upload = await request(app.getHttpServer())
      .post(`/api/expenses/claims/${created.body.id}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .attach('document', PNG_1X1, { filename: 'receipt.png', contentType: 'image/png' });
    expect(upload.status).toBe(201);

    return created.body.id as string;
  }

  function medicalBody(amount = 2500) {
    return {
      category: 'medical',
      amountPkr: amount,
      currency: 'PKR',
      expenseDate: '2026-09',
      notes: 'e2e medical claim',
      details: { subCategory: 'doctor_consultation' },
    };
  }

  function gymBody(amount = 1500) {
    return {
      category: 'gym',
      amountPkr: amount,
      currency: 'PKR',
      expenseDate: '2026-09',
      notes: 'e2e gym claim',
      details: {},
    };
  }

  it('rejects unrestricted details JSON', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/expenses/claims')
      .set('Authorization', `Bearer ${maryamToken}`)
      .send({
        category: 'medical',
        amountPkr: 2000,
        expenseDate: '2026-09',
        notes: 'bad details',
        details: { anythingGoes: true },
      });
    expect(res.status).toBe(400);
  });

  it('employee cannot submit without proof', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/expenses/claims')
      .set('Authorization', `Bearer ${maryamToken}`)
      .send(medicalBody(1000));
    expect(created.status).toBe(201);
    createdClaimIds.push(created.body.id);

    const submitted = await request(app.getHttpServer())
      .post(`/api/expenses/claims/${created.body.id}/submit`)
      .set('Authorization', `Bearer ${maryamToken}`);
    expect(submitted.status).toBe(400);
  });

  it('employee submits; finance approves via Approvals', async () => {
    const id = await createUploadedClaim(maryamToken, medicalBody(3200));

    const submitted = await request(app.getHttpServer())
      .post(`/api/expenses/claims/${id}/submit`)
      .set('Authorization', `Bearer ${maryamToken}`);
    expect(submitted.status).toBe(200);
    expect(submitted.body.status).toBe('pending_approval');
    expect(submitted.body.submittedBy).toBeTruthy();

    const employeeApprove = await request(app.getHttpServer())
      .get('/api/approvals?status=pending&type=expense-claim')
      .set('Authorization', `Bearer ${maryamToken}`);
    expect(employeeApprove.status).toBe(403);

    const approverToken = financeToken ?? adminToken;
    const inbox = await request(app.getHttpServer())
      .get('/api/approvals?status=pending&type=expense-claim&for=me&limit=100')
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
      .get(`/api/expenses/claims/${id}`)
      .set('Authorization', `Bearer ${maryamToken}`);
    expect(fresh.status).toBe(200);
    expect(fresh.body.status).toBe('approved');
    expect(fresh.body.approvedBy).toBeTruthy();
  });

  it('finance can reject with a structured reason', async () => {
    const id = await createUploadedClaim(maryamToken, medicalBody(1800));
    await request(app.getHttpServer())
      .post(`/api/expenses/claims/${id}/submit`)
      .set('Authorization', `Bearer ${maryamToken}`)
      .expect(200);

    const approverToken = financeToken ?? adminToken;
    const inbox = await request(app.getHttpServer())
      .get('/api/approvals?status=pending&type=expense-claim&for=me&limit=100')
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
      .get(`/api/expenses/claims/${id}`)
      .set('Authorization', `Bearer ${maryamToken}`);
    expect(fresh.body.status).toBe('rejected');
    expect(fresh.body.rejectionReasonCode).toBe('outside_policy');
    expect(fresh.body.rejectedBy).toBeTruthy();
    expect(fresh.body.history?.length).toBeGreaterThan(0);
  });

  it('employee cannot approve their own claim', async () => {
    const id = await createUploadedClaim(maryamToken, medicalBody(1000));
    await request(app.getHttpServer())
      .post(`/api/expenses/claims/${id}/submit`)
      .set('Authorization', `Bearer ${maryamToken}`)
      .expect(200);
    const inbox = await request(app.getHttpServer())
      .get('/api/approvals?status=pending&type=expense-claim&for=all&limit=100')
      .set('Authorization', `Bearer ${adminToken}`);
    const row = inbox.body.items.find((item: { sourceId: string }) => item.sourceId === id);
    const blocked = await request(app.getHttpServer())
      .post(`/api/approvals/${row.id}/approve`)
      .set('Authorization', `Bearer ${maryamToken}`)
      .send({});
    expect(blocked.status).toBe(403);
  });

  it('finance may approve their own claim (soft SoD)', async () => {
    if (!financeToken) return;
    const id = await createUploadedClaim(financeToken, gymBody(1800));
    await request(app.getHttpServer())
      .post(`/api/expenses/claims/${id}/submit`)
      .set('Authorization', `Bearer ${financeToken}`)
      .expect(200);

    const inbox = await request(app.getHttpServer())
      .get('/api/approvals?status=pending&type=expense-claim&for=me&limit=100')
      .set('Authorization', `Bearer ${financeToken}`);
    const row = inbox.body.items.find((item: { sourceId: string }) => item.sourceId === id);
    expect(row).toBeTruthy();

    await request(app.getHttpServer())
      .post(`/api/approvals/${row.id}/approve`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({})
      .expect(200);

    const fresh = await request(app.getHttpServer())
      .get(`/api/expenses/claims/${id}`)
      .set('Authorization', `Bearer ${financeToken}`);
    expect(fresh.body.status).toBe('approved');
  });

  it('finance can return for correction; employee resubmits', async () => {
    const id = await createUploadedClaim(maryamToken, medicalBody(1500));
    const submitted = await request(app.getHttpServer())
      .post(`/api/expenses/claims/${id}/submit`)
      .set('Authorization', `Bearer ${maryamToken}`)
      .expect(200);
    const claimNumber = submitted.body.claimNumber as string;

    const approverToken = financeToken ?? adminToken;
    const returned = await request(app.getHttpServer())
      .post(`/api/expenses/claims/${id}/return-for-correction`)
      .set('Authorization', `Bearer ${approverToken}`)
      .send({ reasonCode: 'missing_document', comment: 'Need itemised bill' })
      .expect(200);
    expect(returned.body.status).toBe('returned');
    expect(returned.body.id).toBe(id);
    expect(returned.body.claimNumber).toBe(claimNumber);
    expect(returned.body.returnedBy).toBeTruthy();

    const resubmit = await request(app.getHttpServer())
      .post(`/api/expenses/claims/${id}/submit`)
      .set('Authorization', `Bearer ${maryamToken}`)
      .expect(200);
    expect(resubmit.body.status).toBe('pending_approval');
    expect(resubmit.body.id).toBe(id);
    expect(resubmit.body.claimNumber).toBe(claimNumber);

    const inbox = await request(app.getHttpServer())
      .get('/api/approvals?status=pending&type=expense-claim&for=me&limit=100')
      .set('Authorization', `Bearer ${approverToken}`);
    const pending = (inbox.body.items as Array<{ sourceId: string }>).filter(
      (item) => item.sourceId === id,
    );
    expect(pending).toHaveLength(1);
  });

  it('gym amount cannot exceed 2000 PKR', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/expenses/claims')
      .set('Authorization', `Bearer ${maryamToken}`)
      .send(gymBody(2001));
    expect(res.status).toBe(400);
  });

  it('creates a travel claim with shared fields only', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/expenses/claims')
      .set('Authorization', `Bearer ${maryamToken}`)
      .send({
        category: 'travel',
        amountPkr: 800,
        currency: 'PKR',
        expenseDate: '2026-09',
        notes: 'Airport transfer',
        details: {},
      });
    expect(created.status).toBe(201);
    createdClaimIds.push(created.body.id);
    expect(created.body.category).toBe('travel');
    expect(created.body.details).toEqual({});
    expect(created.body.expenseDate).toMatch(/^2026-09-01/);
  });

  it('rejects submit without description', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/expenses/claims')
      .set('Authorization', `Bearer ${maryamToken}`)
      .send({
        category: 'gym',
        amountPkr: 500,
        currency: 'PKR',
        expenseDate: '2026-09',
        notes: ' ',
        details: {},
      });
    expect(created.status).toBe(400);
  });

  it('rejects extra details on non-medical categories', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/expenses/claims')
      .set('Authorization', `Bearer ${maryamToken}`)
      .send({
        category: 'travel',
        amountPkr: 500,
        currency: 'PKR',
        expenseDate: '2026-09',
        notes: 'Trip',
        details: { purpose: 'Legacy field' },
      });
    expect(res.status).toBe(400);
  });

  it('employee cannot list org-wide claims; finance can', async () => {
    const employeeOrg = await request(app.getHttpServer())
      .get('/api/expenses/claims?scope=org&bucket=resolved')
      .set('Authorization', `Bearer ${maryamToken}`);
    expect(employeeOrg.status).toBe(403);

    const approverToken = financeToken ?? adminToken;
    const financeOrg = await request(app.getHttpServer())
      .get('/api/expenses/claims?scope=org&bucket=resolved')
      .set('Authorization', `Bearer ${approverToken}`);
    expect(financeOrg.status).toBe(200);
  });
});
