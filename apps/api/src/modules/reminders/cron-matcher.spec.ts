/**
 * Cron-matcher unit tests.
 *
 * No DB, no clock — every case constructs a fixed instant and asserts
 * cronMatches against a hand-crafted expression. Instants are chosen
 * with explicit PKT offsets in the comments so the weekday + hour are
 * obvious without doing math.
 */
import { describe, expect, it } from 'vitest';
import { cronMatches, fieldMatches } from './cron-matcher';

// 2026-05-18 (Mon) 09:00 PKT  → 04:00 UTC
const monday0900Pkt = new Date('2026-05-18T04:00:00Z');
// 2026-05-23 (Sat) 09:00 PKT  → 04:00 UTC
const saturday0900Pkt = new Date('2026-05-23T04:00:00Z');
// 2026-05-18 (Mon) 09:30 PKT  → 04:30 UTC
const monday0930Pkt = new Date('2026-05-18T04:30:00Z');
// 2026-01-01 (Thu) 06:00 PKT  → 2026-01-01 01:00 UTC
const newYear0600Pkt = new Date('2026-01-01T01:00:00Z');

describe('fieldMatches — per-field semantics', () => {
  const min = { min: 0, max: 59 };
  const hour = { min: 0, max: 23 };
  const dow = { min: 0, max: 6 };

  it('matches the wildcard', () => {
    expect(fieldMatches('*', 0, min)).toBe(true);
    expect(fieldMatches('*', 59, min)).toBe(true);
  });
  it('matches a literal value', () => {
    expect(fieldMatches('9', 9, hour)).toBe(true);
    expect(fieldMatches('9', 10, hour)).toBe(false);
  });
  it('matches a comma list', () => {
    expect(fieldMatches('1,3,5', 3, dow)).toBe(true);
    expect(fieldMatches('1,3,5', 2, dow)).toBe(false);
  });
  it('matches a range', () => {
    expect(fieldMatches('1-5', 1, dow)).toBe(true);
    expect(fieldMatches('1-5', 5, dow)).toBe(true);
    expect(fieldMatches('1-5', 6, dow)).toBe(false);
  });
  it('matches a step over the whole range', () => {
    expect(fieldMatches('*/15', 0, min)).toBe(true);
    expect(fieldMatches('*/15', 15, min)).toBe(true);
    expect(fieldMatches('*/15', 30, min)).toBe(true);
    expect(fieldMatches('*/15', 10, min)).toBe(false);
  });
  it('matches a stepped range', () => {
    expect(fieldMatches('0-30/10', 0, min)).toBe(true);
    expect(fieldMatches('0-30/10', 10, min)).toBe(true);
    expect(fieldMatches('0-30/10', 30, min)).toBe(true);
    expect(fieldMatches('0-30/10', 40, min)).toBe(false);
  });
  it('matches a comma + step combo', () => {
    expect(fieldMatches('9,*/12', 9, hour)).toBe(true); // hits the literal
    expect(fieldMatches('9,*/12', 0, hour)).toBe(true); // hits step
    expect(fieldMatches('9,*/12', 12, hour)).toBe(true);
    expect(fieldMatches('9,*/12', 13, hour)).toBe(false);
  });
});

describe('cronMatches — five-field expressions', () => {
  it('rejects malformed expressions', () => {
    expect(cronMatches('* * * *', monday0900Pkt)).toBe(false);
    expect(cronMatches('not a cron', monday0900Pkt)).toBe(false);
  });
  it('matches daily-at-9am exactly at 9am Mon', () => {
    expect(cronMatches('0 9 * * *', monday0900Pkt)).toBe(true);
  });
  it("doesn't match daily-at-9am at 9:30", () => {
    expect(cronMatches('0 9 * * *', monday0930Pkt)).toBe(false);
  });
  it('matches Monday-9am on Mon, not Sat', () => {
    expect(cronMatches('0 9 * * 1', monday0900Pkt)).toBe(true);
    expect(cronMatches('0 9 * * 1', saturday0900Pkt)).toBe(false);
  });
  it('matches weekdays-only pattern Mon-Fri', () => {
    expect(cronMatches('0 9 * * 1-5', monday0900Pkt)).toBe(true);
    expect(cronMatches('0 9 * * 1-5', saturday0900Pkt)).toBe(false);
  });
  it('matches 1st-of-month at 6am on New Year', () => {
    expect(cronMatches('0 6 1 * *', newYear0600Pkt)).toBe(true);
  });
  it('matches January-only constraint on New Year', () => {
    expect(cronMatches('0 6 1 1 *', newYear0600Pkt)).toBe(true);
  });
  it("doesn't match Feb-only constraint on New Year", () => {
    expect(cronMatches('0 6 1 2 *', newYear0600Pkt)).toBe(false);
  });
  it('matches "every 15 min during business hours" idiom on 9:00', () => {
    expect(cronMatches('*/15 9-17 * * 1-5', monday0900Pkt)).toBe(true);
  });
  it('does not match the same on Sat 9:00', () => {
    expect(cronMatches('*/15 9-17 * * 1-5', saturday0900Pkt)).toBe(false);
  });
});
