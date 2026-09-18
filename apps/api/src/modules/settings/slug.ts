/**
 * Slug helpers — shared by every settings CRUD screen (Departments, Job
 * titles, Roles, ...) that derives a URL/API-safe unique identifier from
 * a human-entered display name.
 */

/** Lowercase, hyphenated, alphanumeric-only slug derived from a name. */
export function slugFromName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base.length > 0 ? base : 'item';
}

/**
 * Appends -2, -3, ... to `base` until `exists` reports no collision.
 * Callers pass an `exists` check that already excludes the record being
 * updated, so renaming a row back to a slug it previously held doesn't
 * collide with itself.
 */
export async function uniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  let candidate = base;
  let suffix = 2;
  while (await exists(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}
