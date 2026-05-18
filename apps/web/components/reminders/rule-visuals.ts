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
 *   `-P14D` → "14d before"
 *   `P0D`   → "on day"
 *   `P3D`   → "3d after"
 *   cron    → "on day" (cron rules fire at the moment they evaluate)
 */
export function leadTimeLabel(spec: {
  kind: 'event' | 'cron';
  offset?: string;
}): LeadTimeInfo {
  if (spec.kind === 'cron') return { text: 'on day', direction: 'same' };
  const offset = spec.offset ?? '';
  const m = /^(-?)P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/.exec(
    offset,
  );
  if (!m) return { text: offset || 'on day', direction: 'same' };
  const sign = m[1] === '-' ? 'before' : 'after';
  const parts: string[] = [];
  if (m[2]) parts.push(`${m[2]}y`);
  if (m[3]) parts.push(`${m[3]}mo`);
  if (m[4]) parts.push(`${m[4]}w`);
  if (m[5]) parts.push(`${m[5]}d`);
  if (m[6]) parts.push(`${m[6]}h`);
  if (m[7]) parts.push(`${m[7]}m`);
  if (parts.length === 0) return { text: 'on day', direction: 'same' };
  return { text: `${parts.join(' ')} ${sign}`, direction: sign };
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
