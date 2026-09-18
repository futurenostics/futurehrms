import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { prisma } from '@futurenostics/db';
import { AppModule } from '../src/app.module';

/**
 * Settings > Departments e2e: covers the permission boundary
 * (settings:departments:view vs :manage vs none), the CRUD happy path,
 * and the soft-delete edge cases — block-hide-while-in-use, hide,
 * list excludes hidden, name-reuse-on-hidden-row routes to
 * DEPARTMENT_HIDDEN (not a duplicate), and restore.
 */
describe('Settings > Departments (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let asmaToken: string;
  let maryamToken: string;
  let createdId: string;
  const testName = `Test Dept ${Date.now()}`;

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

    // department_manager — holds settings:departments:view but not :manage.
    const asma = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'asma.ali@futurenostics.local', password: seedPwd });
    asmaToken = asma.body.accessToken;

    // plain employee — holds no settings permissions at all.
    const maryam = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'maryam.iqbal@futurenostics.local', password: seedPwd });
    maryamToken = maryam.body.accessToken;
  });

  afterAll(async () => {
    if (createdId) {
      await prisma.auditLog.deleteMany({ where: { entity: 'Department', entityId: createdId } });
      await prisma.department.delete({ where: { id: createdId } }).catch(() => undefined);
    }
    await app?.close();
  });

  it('blocks a user with no settings permission from viewing the list', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/settings/departments')
      .set('Authorization', `Bearer ${maryamToken}`);
    expect(res.status).toBe(403);
  });

  it('lets a view-only user list departments but not create one', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/settings/departments')
      .set('Authorization', `Bearer ${asmaToken}`);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.items)).toBe(true);

    const create = await request(app.getHttpServer())
      .post('/api/settings/departments')
      .set('Authorization', `Bearer ${asmaToken}`)
      .send({ name: 'Should Not Be Created' });
    expect(create.status).toBe(403);
  });

  it('creates a department with a description', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/settings/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: testName, description: '  Builds the product.  ' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe(testName);
    expect(res.body.description).toBe('Builds the product.');
    expect(res.body.employeeCount).toBe(0);
    expect(res.body.hiddenAt).toBeNull();
    createdId = res.body.id;
  });

  it('renames a department and clears its description', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/settings/departments/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `${testName} Renamed`, description: null });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe(`${testName} Renamed`);
    expect(res.body.description).toBeNull();
  });

  it('sets, reports, and clears a department head', async () => {
    const employee = await prisma.employee.findFirstOrThrow({ where: { deletedAt: null } });

    const setHead = await request(app.getHttpServer())
      .patch(`/api/settings/departments/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `${testName} Renamed`, headEmployeeId: employee.id });
    expect(setHead.status).toBe(200);
    expect(setHead.body.head).toEqual({ id: employee.id, fullName: employee.fullName });

    const rejectInvalid = await request(app.getHttpServer())
      .patch(`/api/settings/departments/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `${testName} Renamed`, headEmployeeId: 'not-a-real-employee-id' });
    expect(rejectInvalid.status).toBe(400);

    const clearHead = await request(app.getHttpServer())
      .patch(`/api/settings/departments/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `${testName} Renamed`, headEmployeeId: null });
    expect(clearHead.status).toBe(200);
    expect(clearHead.body.head).toBeNull();
  });

  it('refuses to hide a department that still has people in it', async () => {
    const engineering = await prisma.department.findFirstOrThrow({
      where: { slug: 'engineering' },
    });
    const res = await request(app.getHttpServer())
      .delete(`/api/settings/departments/${engineering.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DEPARTMENT_IN_USE');
    expect(res.body.employeeCount).toBeGreaterThan(0);
  });

  it('hides an empty department, excludes it from the default list, and routes a name clash to restore', async () => {
    const hide = await request(app.getHttpServer())
      .delete(`/api/settings/departments/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(hide.status).toBe(200);
    expect(hide.body.id).toBe(createdId);

    const defaultList = await request(app.getHttpServer())
      .get('/api/settings/departments')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(defaultList.body.items.some((d: { id: string }) => d.id === createdId)).toBe(false);

    const withHidden = await request(app.getHttpServer())
      .get('/api/settings/departments?includeHidden=true')
      .set('Authorization', `Bearer ${adminToken}`);
    const hiddenRow = withHidden.body.items.find((d: { id: string }) => d.id === createdId);
    expect(hiddenRow).toBeDefined();
    expect(hiddenRow.hiddenAt).not.toBeNull();

    const clash = await request(app.getHttpServer())
      .post('/api/settings/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `${testName} Renamed` });
    expect(clash.status).toBe(409);
    expect(clash.body.code).toBe('DEPARTMENT_HIDDEN');
    expect(clash.body.hiddenId).toBe(createdId);
  });

  it('restores a hidden department', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/settings/departments/${createdId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(createdId);
    expect(res.body.hiddenAt).toBeNull();
    expect(res.body.isActive).toBe(true);
  });
});
