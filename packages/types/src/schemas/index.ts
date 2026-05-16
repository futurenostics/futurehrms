/**
 * Shared zod schemas — single source of truth for FE + BE validation.
 *
 * Phase 0: just the auth surface (login, refresh). Each domain module
 * adds its own entity schemas (employee, project, commission-rule, ...)
 * under sibling files as it lands.
 */
export * from './auth';
export * from './employee';
