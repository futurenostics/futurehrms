import { Injectable, Logger } from '@nestjs/common';

/**
 * Notification type registry.
 *
 * Modules register their notification types here on bootstrap (typically
 * via `onModuleInit` in the module's NestJS module class). Each
 * registration declares:
 *
 *   - title / body templates (currently string templates with `{{var}}`
 *     interpolation — keep it simple; React Email templates plug in at
 *     the channel layer later, not here)
 *   - link template — the in-app deep link the notification points at
 *   - severity — drives the badge tone
 *   - default channels — what the user gets if they have no explicit
 *     preference row. The user's preferences override this per channel.
 *
 * The registry is process-wide (in-memory). Re-registration with the
 * same key replaces the previous definition — handy in dev with hot
 * reload, harmless in prod since modules only register once.
 */

export type Severity = 'info' | 'success' | 'warning' | 'danger';
export type Channel = 'in_app' | 'email' | 'push' | 'slack';

export interface NotificationTypeDefinition {
  /** Stable identifier — keep namespaced (`module.kind`) so collisions are obvious. */
  key: string;
  /** Display name for admin UIs. */
  name: string;
  /** Short blurb for the registry endpoint. */
  description?: string;
  severity: Severity;
  /** Channels enabled by default — user prefs override per channel. */
  defaultChannels: Channel[];
  /**
   * Mustache-flavored template — `{{var}}` is replaced with
   * `payload[var]` at send time. Missing vars render as empty string.
   */
  titleTemplate: string;
  bodyTemplate: string;
  /** Optional template that produces the in-app deep link. */
  linkTemplate?: string;
  /** Module key (`commissions`, `employees`, …) for filtering / grouping. */
  module: string;
}

@Injectable()
export class NotificationTypesRegistry {
  private readonly logger = new Logger(NotificationTypesRegistry.name);
  private readonly defs = new Map<string, NotificationTypeDefinition>();

  register(def: NotificationTypeDefinition): void {
    if (this.defs.has(def.key)) {
      this.logger.warn(`Notification type '${def.key}' is being re-registered.`);
    }
    this.defs.set(def.key, def);
  }

  registerMany(defs: NotificationTypeDefinition[]): void {
    for (const d of defs) this.register(d);
  }

  get(key: string): NotificationTypeDefinition | undefined {
    return this.defs.get(key);
  }

  /** Throws if the type isn't registered — for senders that must not fail silently. */
  require(key: string): NotificationTypeDefinition {
    const def = this.defs.get(key);
    if (!def) {
      throw new Error(
        `Unknown notification type '${key}'. Did the owning module forget to register it on init?`,
      );
    }
    return def;
  }

  list(): NotificationTypeDefinition[] {
    return Array.from(this.defs.values()).sort((a, b) => a.key.localeCompare(b.key));
  }

  /**
   * Mustache-lite interpolation. Replaces `{{var}}` with
   * `String(payload[var] ?? '')`. Whitespace inside the braces is
   * tolerated. No nested-property paths in Phase 3 — keep payloads flat.
   */
  static interpolate(
    template: string,
    payload: Record<string, unknown> | null | undefined,
  ): string {
    if (!payload) return template.replace(/\{\{\s*\w+\s*\}\}/g, '');
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
      const v = payload[key];
      return v === undefined || v === null ? '' : String(v);
    });
  }
}
