import { Injectable, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import { PasswordService } from './password.service';
import { TokensService } from './tokens.service';
import { RbacService } from '../rbac/rbac.service';
import type { AuthenticatedUser } from './types';

const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_MS = 30 * 60 * 1000;

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: AuthenticatedUser & { fullName: string | null; employeeId: string | null };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly passwords: PasswordService,
    private readonly tokens: TokensService,
    private readonly rbac: RbacService,
  ) {}

  async login(
    email: string,
    password: string,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<LoginResult> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { employee: { select: { id: true, fullName: true } } },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException(
        'Account temporarily locked due to failed login attempts. Try again later.',
      );
    }

    const matches = await this.passwords.verify(user.passwordHash, password);
    if (!matches) {
      await this.registerFailedAttempt(user.id, user.failedLoginAttempts);
      throw new UnauthorizedException('Invalid credentials');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const accessToken = await this.tokens.signAccessToken({ userId: user.id, email: user.email });
    const refresh = await this.tokens.signRefreshToken({ userId: user.id });

    await prisma.refreshToken.create({
      data: {
        id: refresh.jti,
        userId: user.id,
        tokenHash: this.tokens.hashToken(refresh.token),
        expiresAt: refresh.expiresAt,
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
      },
    });

    const [permissions, roles] = await Promise.all([
      this.rbac.getEffectivePermissions(user.id),
      this.rbac.getRolesForUser(user.id),
    ]);

    return {
      accessToken,
      refreshToken: refresh.token,
      refreshExpiresAt: refresh.expiresAt,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.employee?.fullName ?? null,
        employeeId: user.employee?.id ?? null,
        permissions: [...permissions],
        roles,
      },
    };
  }

  async refresh(
    refreshToken: string,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<{ accessToken: string; refreshToken: string; refreshExpiresAt: Date }> {
    const payload = await this.tokens.verifyRefreshToken(refreshToken).catch(() => {
      throw new UnauthorizedException('Invalid refresh token');
    });

    const row = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });
    if (!row || row.revokedAt || row.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token revoked or expired');
    }
    if (row.tokenHash !== this.tokens.hashToken(refreshToken)) {
      throw new UnauthorizedException('Refresh token mismatch');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('User no longer active');
    }

    // Rotate: revoke old, issue new.
    await prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    });

    const accessToken = await this.tokens.signAccessToken({ userId: user.id, email: user.email });
    const refresh = await this.tokens.signRefreshToken({ userId: user.id });
    await prisma.refreshToken.create({
      data: {
        id: refresh.jti,
        userId: user.id,
        tokenHash: this.tokens.hashToken(refresh.token),
        expiresAt: refresh.expiresAt,
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
      },
    });

    return {
      accessToken,
      refreshToken: refresh.token,
      refreshExpiresAt: refresh.expiresAt,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const payload = await this.tokens.verifyRefreshToken(refreshToken).catch(() => null);
    if (!payload) return;
    await prisma.refreshToken
      .update({ where: { id: payload.jti }, data: { revokedAt: new Date() } })
      .catch(() => {
        // If the token doesn't exist or is already revoked, treat as success.
      });
  }

  async resolveUser(userId: string): Promise<AuthenticatedUser | null> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive || user.deletedAt) {
      return null;
    }
    const [permissions, roles] = await Promise.all([
      this.rbac.getEffectivePermissions(user.id),
      this.rbac.getRolesForUser(user.id),
    ]);
    return {
      id: user.id,
      email: user.email,
      permissions: [...permissions],
      roles,
    };
  }

  async getCurrentUserPayload(
    userId: string,
  ): Promise<(AuthenticatedUser & { fullName: string | null; employeeId: string | null }) | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: { select: { id: true, fullName: true } } },
    });
    if (!user || !user.isActive || user.deletedAt) return null;
    const [permissions, roles] = await Promise.all([
      this.rbac.getEffectivePermissions(user.id),
      this.rbac.getRolesForUser(user.id),
    ]);
    return {
      id: user.id,
      email: user.email,
      fullName: user.employee?.fullName ?? null,
      employeeId: user.employee?.id ?? null,
      permissions: [...permissions],
      roles,
    };
  }

  private async registerFailedAttempt(userId: string, currentAttempts: number): Promise<void> {
    const nextAttempts = currentAttempts + 1;
    const lockedUntil =
      nextAttempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null;

    await prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: nextAttempts, lockedUntil },
    });

    if (lockedUntil) {
      this.logger.warn(`User ${userId} locked until ${lockedUntil.toISOString()}`);
    }
  }
}
