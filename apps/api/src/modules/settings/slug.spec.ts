import { describe, expect, it } from 'vitest';
import { slugFromName, uniqueSlug } from './slug';

describe('slugFromName', () => {
  it('lowercases and hyphenates', () => {
    expect(slugFromName('Business Development')).toBe('business-development');
  });

  it('collapses runs of non-alphanumeric characters into one hyphen', () => {
    expect(slugFromName('R&D / Engineering!!')).toBe('r-d-engineering');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugFromName('  -HR-  ')).toBe('hr');
  });

  it('falls back to "item" when nothing alphanumeric remains', () => {
    expect(slugFromName('!!!')).toBe('item');
  });
});

describe('uniqueSlug', () => {
  it('returns the base slug when there is no collision', async () => {
    const result = await uniqueSlug('engineering', async () => false);
    expect(result).toBe('engineering');
  });

  it('appends -2 on a single collision', async () => {
    const taken = new Set(['engineering']);
    const result = await uniqueSlug('engineering', async (c) => taken.has(c));
    expect(result).toBe('engineering-2');
  });

  it('keeps incrementing past multiple collisions', async () => {
    const taken = new Set(['engineering', 'engineering-2', 'engineering-3']);
    const result = await uniqueSlug('engineering', async (c) => taken.has(c));
    expect(result).toBe('engineering-4');
  });
});
