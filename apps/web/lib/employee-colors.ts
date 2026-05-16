/**
 * Deterministic avatar colors keyed by name (or any stable string).
 *
 * Matches the design's per-employee colorway pattern: the same person
 * always gets the same soft pastel background + matching darker text.
 * Names with no input fall back to the violet accent so loading state
 * still renders coherent shapes.
 *
 * Single palette across light + dark mode. The pastels are bright
 * enough to read on the dark panel without being garish; if that ever
 * breaks down we'll switch to a theme-aware OKLCH set.
 */

const HUES = [280, 145, 22, 245, 175, 320, 200, 65, 95, 350];

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export interface AvatarColors {
  background: string;
  color: string;
}

export function avatarColorsFor(name: string | null | undefined): AvatarColors {
  const trimmed = (name ?? '').trim();
  if (!trimmed) {
    return { background: 'oklch(0.92 0.07 280)', color: 'oklch(0.38 0.15 280)' };
  }
  const hue = HUES[hashString(trimmed) % HUES.length]!;
  return {
    background: `oklch(0.92 0.07 ${hue})`,
    color: `oklch(0.38 0.15 ${hue})`,
  };
}
