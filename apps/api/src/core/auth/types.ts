/**
 * Identity attached to `request.user` after the JwtAuthGuard succeeds.
 * Carries the bare minimum the guards and downstream services need —
 * full profile data is fetched via `/auth/me` so subsequent requests
 * don't pay for a roundtrip on every call.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  /** Linked employee record id when this user is also an employee — drives view_own scope. */
  employeeId: string | null;
  /** Resolved permission keys, populated by the JwtAuthGuard. */
  permissions: string[];
  /** Role slugs the user holds. */
  roles: string[];
  /**
   * Department IDs the user's roles are scoped to.
   *
   * Empty array when the user holds only global (unscoped) roles like
   * super_admin or hr_admin — those bypass dept filtering entirely
   * (controlled by the `view_all` permission, not by this list).
   *
   * Department managers and team leads carry one or more entries here
   * via the `UserRole.departmentScope` column. Row-level scoping
   * helpers union the list when applying WHERE clauses.
   */
  scopedDepartmentIds: string[];
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
