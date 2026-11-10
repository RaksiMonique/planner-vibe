import { describe, expect, it } from 'vitest';
import { decideAccess, parseAllowList } from './rules';

const pending = { status: 'pending', role: 'member' } as const;

describe('decideAccess', () => {
  it('approves allow-listed emails and makes the first one the owner', () => {
    expect(
      decideAccess({
        email: 'Me@x.com',
        current: pending,
        allowList: ['me@x.com'],
        ownerExists: false,
      })
    ).toEqual({ status: 'approved', role: 'owner' });
    expect(
      decideAccess({
        email: 'me@x.com',
        current: pending,
        allowList: ['me@x.com'],
        ownerExists: true,
      })
    ).toEqual({ status: 'approved', role: 'member' });
  });
  it('keeps others pending when an allow list exists', () => {
    expect(
      decideAccess({
        email: 'guest@x.com',
        current: pending,
        allowList: ['me@x.com'],
        ownerExists: true,
      })
    ).toEqual(pending);
  });
  it('makes the first sign-in the owner when there is no allow list', () => {
    expect(
      decideAccess({ email: 'first@x.com', current: pending, allowList: [], ownerExists: false })
    ).toEqual({ status: 'approved', role: 'owner' });
    expect(
      decideAccess({ email: 'second@x.com', current: pending, allowList: [], ownerExists: true })
    ).toEqual(pending);
  });
  it('never downgrades approved or unblocks blocked users by itself', () => {
    expect(
      decideAccess({
        email: 'a@x.com',
        current: { status: 'approved', role: 'member' },
        allowList: [],
        ownerExists: true,
      }).status
    ).toBe('approved');
    expect(
      decideAccess({
        email: 'b@x.com',
        current: { status: 'blocked', role: 'member' },
        allowList: [],
        ownerExists: true,
      }).status
    ).toBe('blocked');
  });
  it('parses the allow list loosely', () => {
    expect(parseAllowList(' A@x.com, b@x.com ,, ')).toEqual(['a@x.com', 'b@x.com']);
    expect(parseAllowList(undefined)).toEqual([]);
  });
});
