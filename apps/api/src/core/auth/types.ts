/**
 * Identity attached to `request.user` after the JwtAuthGuard succeeds.
 * Carries the bare minimum the guards and downstream services need —
 * full profile data is fetched via `/auth/me` so subsequent requests
 * don't pay for a roundtrip on every call.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  /** Resolved permission keys, populated by the JwtAuthGuard. */
  permissions: string[];
  /** Role slugs the user holds. */
  roles: string[];
}

export interface JwtAccessPayload {
  sub: string;
  email: string;
  /** Token type discriminator — 'access' vs 'refresh'. */
  type: 'access';
  iat: number;
  exp: number;
}

export interface JwtRefreshPayload {
  sub: string;
  type: 'refresh';
  /** Refresh-token row id, used for server-side revocation. */
  jti: string;
  iat: number;
  exp: number;
}
