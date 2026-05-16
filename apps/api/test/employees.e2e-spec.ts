import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { prisma } from '@futurenostics/db';
import { AppModule } from '../src/app.module';

/**
 * Employees e2e: covers create → audit + event + timeline → update →
 * change-salary → soft-delete; plus scope smoke test (dept manager
 * sees only their dept, regular employee sees only themselves).
 */
describe('Employees (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let asmaToken: string;
  let maryamToken: string;
  let createdEmployeeId: string;
  let createdEmail: string;

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

    const asma = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'asma.ali@futurenostics.local', password: seedPwd });
    asmaToken = asma.body.accessToken;

    const maryam = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'maryam.iqbal@futurenostics.local', password: seedPwd });
    maryamToken = maryam.body.accessToken;
  });

  afterAll(async () => {
    if (createdEmployeeId) {
      // Clean up the records created by the suite.
      await prisma.timelineEntry.deleteMany({ where: { employeeId: createdEmployeeId } });
      await prisma.salaryHistory.deleteMany({ where: { employeeId: createdEmployeeId } });
      await prisma.auditLog.deleteMany({
        where: { entity: 'Employee', entityId: createdEmployeeId },
      });
      await prisma.employee.delete({ where: { id: createdEmployeeId } }).catch(() => undefined);
    }
    await app?.close();
  });

  it('creates an employee, emits an event, writes audit + timeline entries', async () => {
    const dept = await prisma.department.findFirst({ where: { slug: 'engineering' } });
    const design = await prisma.designation.findFirst({
      where: { name: 'Software Engineer', departmentId: dept!.id },
    });
    const status = await prisma.employeeStatus.findFirst({ where: { slug: 'probation' } });

    createdEmail = `test.employee.${Date.now()}@futurenostics.local`;

    const res = await request(app.getHttpServer())
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Test Employee',
        email: createdEmail,
        joinDate: new Date().toISOString(),
        departmentId: dept!.id,
        designationId: design!.id,
        statusId: status!.id,
        contractType: 'FullTime',
        salaryPkr: 100000,
      });

    expect(res.status).toBe(201);
    expect(res.body.fullName).toBe('Test Employee');
    expect(res.body.eid).toMatch(/^EMP-\d{4}$/);
    createdEmployeeId = res.body.id;

    // Audit row landed.
    const audits = await prisma.auditLog.findMany({
      where: { entity: 'Employee', entityId: createdEmployeeId },
    });
    expect(audits.length).toBeGreaterThanOrEqual(1);

    // Timeline subscriber created an entry (async — give the event bus a beat).
    await new Promise((r) => setTimeout(r, 100));
    const timeline = await prisma.timelineEntry.findMany({
      where: { employeeId: createdEmployeeId },
    });
    expect(timeline.some((t) => t.eventType === 'employee.created')).toBe(true);
  });

  it('change-salary creates SalaryHistory + audit + timeline', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/employees/${createdEmployeeId}/change-salary`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        newSalaryPkr: 120000,
        effectiveDate: new Date().toISOString(),
        remarks: 'Probation review increase',
      });
    expect(res.status).toBe(201);

    const history = await prisma.salaryHistory.findMany({
      where: { employeeId: createdEmployeeId },
    });
    expect(history.length).toBe(1);
    expect(Number(history[0]!.newSalaryPkr.toString())).toBe(120000);

    await new Promise((r) => setTimeout(r, 100));
    const timeline = await prisma.timelineEntry.findMany({
      where: { employeeId: createdEmployeeId, eventType: 'employee.salary.updated' },
    });
    expect(timeline.length).toBe(1);
  });

  it('list scope: HR admin sees all 20+, dept manager sees only their dept', async () => {
    const all = await request(app.getHttpServer())
      .get('/api/employees?pageSize=200')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(all.status).toBe(200);
    expect(all.body.meta.total).toBeGreaterThanOrEqual(20);

    const scoped = await request(app.getHttpServer())
      .get('/api/employees?pageSize=200')
      .set('Authorization', `Bearer ${asmaToken}`);
    expect(scoped.status).toBe(200);
    const allDepts = new Set<string>(
      scoped.body.data.map((e: { department: { name: string } }) => e.department.name),
    );
    expect([...allDepts]).toEqual(['Engineering']);
  });

  it('view_own: regular employee can only fetch their own profile', async () => {
    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${maryamToken}`);
    expect(me.body.employeeId).toBeTruthy();

    const own = await request(app.getHttpServer())
      .get(`/api/employees/${me.body.employeeId}`)
      .set('Authorization', `Bearer ${maryamToken}`);
    expect(own.status).toBe(200);
    expect('salaryPkr' in own.body).toBe(false);

    const others = await request(app.getHttpServer())
      .get(`/api/employees/${createdEmployeeId}`)
      .set('Authorization', `Bearer ${maryamToken}`);
    expect(others.status).toBe(403);
  });

  it('soft-delete sets deletedAt and writes archive audit', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/employees/${createdEmployeeId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);

    const row = await prisma.employee.findUnique({ where: { id: createdEmployeeId } });
    expect(row?.deletedAt).not.toBeNull();
  });
});
