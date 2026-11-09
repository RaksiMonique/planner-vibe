import { describe, expect, it } from 'vitest';
import { isEmailAllowed, sanitizeNext } from './schema';

describe('sanitizeNext', () => {
  it('keeps same-origin paths and rejects everything else', () => {
    expect(sanitizeNext('/calendar')).toBe('/calendar');
    expect(sanitizeNext('//evil.example')).toBe('/dashboard');
    expect(sanitizeNext('https://evil.example')).toBe('/dashboard');
    expect(sanitizeNext(null)).toBe('/dashboard');
  });
});

describe('isEmailAllowed', () => {
  it('allows everyone when no list is configured', () => {
    expect(isEmailAllowed('a@b.c', undefined)).toBe(true);
    expect(isEmailAllowed('a@b.c', '  ')).toBe(true);
  });
  it('matches the list case-insensitively', () => {
    expect(isEmailAllowed('Me@Example.com', 'me@example.com, other@example.com')).toBe(true);
    expect(isEmailAllowed('nope@example.com', 'me@example.com')).toBe(false);
    expect(isEmailAllowed(undefined, 'me@example.com')).toBe(false);
  });
});
