/**
 * Shared visual helpers for the reminders surfaces:
 *
 *   - ruleHue(key)        : deterministic OKLCH hue for a rule's dot
 *   - leadTimeLabel(spec) : "14d before" / "on day" / "in 7d" etc.
 *   - templateLabel(type) : friendly email-template filename for the
 *                           rules-list "EMAIL TEMPLATE" column
 */

const NAMED_RULE_HUES: Record<string, number> = {
  // Match the design's colors as closely as practical
  'probation-end': 22, // orange
  'internship-end': 145, // green
  'annual-review': 280, // violet
  'biannual-review': 22, // orange
  birthday: 145, // green
  'work-anniversary': 145, // green
  'visa-renewal': 22, // orange
  'document-expiring': 22, // orange
};

export function ruleHue(key: string): number {
  // strip dept suffixes like "-eng" / "-bd" — both share the parent's hue
  const normalised = key.replace(/-(eng|bd|hr|engineering|business-development)$/, '');
  if (NAMED_RULE_HUES[normalised] != null) return NAMED_RULE_HUES[normalised]!;
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) % 360;
}

export interface LeadTimeInfo {
  text: string;
  direction: 'before' | 'after' | 'same';
}

/**
 * Convert a trigger spec to the design's lead-time vocabulary.
 * After dropping the offset, event rules fire on the event moment
 * and cron rules fire on each match — so the column just reflects
 * that distinction. The actual "N days before X" semantics live on
 * cron rules with the in_exactly_days / anniversary_in_exactly_days
 * condition operators, which the column doesn't try to summarise.
 */
export function leadTimeLabel(spec: { kind: 'event' | 'cron' }): LeadTimeInfo {
  if (spec.kind === 'cron') return { text: 'on schedule', direction: 'same' };
  return { text: 'on event', direction: 'same' };
}

/**
 * Friendly "filename" for the EMAIL TEMPLATE column. Maps a
 * notificationType key to a kebab-cased filename — matches what the
 * design shows even though the actual templates aren't on disk yet.
 */
export function templateLabel(notificationType: string): string {
  const tail = notificationType.startsWith('reminders.')
    ? notificationType.slice('reminders.'.length)
    : notificationType;
  return `${tail}.tpl`;
}
