import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * End-to-end auth flow.
 *
 * Boots the full NestJS app (with global guards, throttler, audit
 * middleware) against a real Postgres + Redis from docker compose,
 * then walks:
 *   1. POST /api/auth/login → access token + refresh cookie
 *   2. GET /api/auth/me with the access token → user payload
 *   3. GET /api/auth/me without a token → 401
 *
 * Requires the seed to have run so an admin user exists.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api', { exclude: ['health'] });
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /health returns ok without auth', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });

  it('rejects /api/auth/me without a token', async () => {
    const res = await request(app.getHttpServer()).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('logs in, sets the refresh cookie, and resolves /me', async () => {
    const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@futurenostics.local';
    const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!Now123';

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password });

    expect(login.status).toBe(200);
    expect(login.body.accessToken).toBeTypeOf('string');
    expect(login.body.user.email).toBe(email);
    expect(Array.isArray(login.body.user.permissions)).toBe(true);
    const setCookie = login.headers['set-cookie'];
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    const refreshCookie = cookies.find((c) => c.startsWith('fn_refresh='));
    expect(refreshCookie).toBeDefined();

    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(email);
    expect(me.body.roles).toContain('super_admin');
  });

  it('rejects malformed credentials with 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'nobody@futurenostics.local', password: 'definitelywrong!' });
    expect([401, 429]).toContain(res.status);
  });
});
