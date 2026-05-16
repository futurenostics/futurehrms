import { Injectable } from '@nestjs/common';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { createHash, randomUUID } from 'node:crypto';
import { AppConfigService } from '../../config/app.config';
import type { JwtAccessPayload, JwtRefreshPayload } from './types';

/**
 * JWT minting + verification.
 *
 * Access tokens are short-lived and never revocable — clients just stop
 * sending them. Refresh tokens carry a `jti` that maps to a DB row so
 * they can be revoked server-side (logout, password change, admin kick).
 */
@Injectable()
export class TokensService {
  private readonly accessSecret: Uint8Array;
  private readonly refreshSecret: Uint8Array;
  private readonly accessExpiry: string;
  private readonly refreshExpiry: string;
  private readonly issuer = 'futurenostics-hrms';

  constructor(config: AppConfigService) {
    this.accessSecret = new TextEncoder().encode(config.env.JWT_ACCESS_SECRET);
    this.refreshSecret = new TextEncoder().encode(config.env.JWT_REFRESH_SECRET);
    this.accessExpiry = config.env.JWT_ACCESS_EXPIRY;
    this.refreshExpiry = config.env.JWT_REFRESH_EXPIRY;
  }

  async signAccessToken(input: { userId: string; email: string }): Promise<string> {
    return new SignJWT({ email: input.email, type: 'access' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(input.userId)
      .setIssuer(this.issuer)
      .setIssuedAt()
      .setExpirationTime(this.accessExpiry)
      .sign(this.accessSecret);
  }

  async signRefreshToken(input: {
    userId: string;
    /** Override the default refresh TTL (e.g. for remember-me sessions). */
    ttlSeconds?: number;
  }): Promise<{ token: string; jti: string; expiresAt: Date }> {
    const jti = randomUUID();
    const expirationTime =
      input.ttlSeconds !== undefined
        ? Math.floor(Date.now() / 1000) + input.ttlSeconds
        : this.refreshExpiry;
    const token = await new SignJWT({ type: 'refresh' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(input.userId)
      .setJti(jti)
      .setIssuer(this.issuer)
      .setIssuedAt()
      .setExpirationTime(expirationTime)
      .sign(this.refreshSecret);

    const payload = await this.verifyRefreshToken(token);
    return { token, jti, expiresAt: new Date(payload.exp * 1000) };
  }

  async verifyAccessToken(token: string): Promise<JwtAccessPayload> {
    const { payload } = await jwtVerify(token, this.accessSecret, { issuer: this.issuer });
    return this.assertAccessPayload(payload);
  }

  async verifyRefreshToken(token: string): Promise<JwtRefreshPayload> {
    const { payload } = await jwtVerify(token, this.refreshSecret, { issuer: this.issuer });
    return this.assertRefreshPayload(payload);
  }

  /**
   * SHA-256 of a refresh token, suitable for storing alongside the JWT
   * row so a stolen DB doesn't grant the attacker live tokens.
   */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private assertAccessPayload(payload: JWTPayload): JwtAccessPayload {
    if (
      typeof payload.sub === 'string' &&
      typeof payload.email === 'string' &&
      payload.type === 'access' &&
      typeof payload.iat === 'number' &&
      typeof payload.exp === 'number'
    ) {
      return {
        sub: payload.sub,
        email: payload.email,
        type: 'access',
        iat: payload.iat,
        exp: payload.exp,
      };
    }
    throw new Error('Malformed access token payload');
  }

  private assertRefreshPayload(payload: JWTPayload): JwtRefreshPayload {
    if (
      typeof payload.sub === 'string' &&
      payload.type === 'refresh' &&
      typeof payload.jti === 'string' &&
      typeof payload.iat === 'number' &&
      typeof payload.exp === 'number'
    ) {
      return {
        sub: payload.sub,
        type: 'refresh',
        jti: payload.jti,
        iat: payload.iat,
        exp: payload.exp,
      };
    }
    throw new Error('Malformed refresh token payload');
  }
}
