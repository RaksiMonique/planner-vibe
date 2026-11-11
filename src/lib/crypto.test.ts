import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret, signValue, verifySignedValue } from './crypto';

const secret = 'a-test-key-that-is-long-enough';

describe('encryptSecret / decryptSecret', () => {
  it('round-trips and never repeats ciphertext', () => {
    const a = encryptSecret('refresh-token-1', secret);
    const b = encryptSecret('refresh-token-1', secret);
    expect(a).not.toBe(b);
    expect(decryptSecret(a, secret)).toBe('refresh-token-1');
    expect(decryptSecret(b, secret)).toBe('refresh-token-1');
  });

  it('rejects tampering and the wrong key', () => {
    const token = encryptSecret('hello', secret);
    const [iv, tag, body] = token.split('.');
    const flipped = Buffer.from(body, 'base64url');
    flipped[0] ^= 1;
    expect(() =>
      decryptSecret([iv, tag, flipped.toString('base64url')].join('.'), secret)
    ).toThrow();
    expect(() => decryptSecret(token, 'another-key-that-is-long-enough')).toThrow();
  });

  it('refuses a short key', () => {
    expect(() => encryptSecret('x', 'short')).toThrow(/TOKEN_ENCRYPTION_KEY/);
  });
});

describe('signValue / verifySignedValue', () => {
  it('verifies what it signed and nothing else', () => {
    const signed = signValue('user-1:nonce', secret);
    expect(verifySignedValue(signed, secret)).toBe('user-1:nonce');
    expect(verifySignedValue(signed.replace('nonce', 'other'), secret)).toBeNull();
    expect(verifySignedValue('garbage', secret)).toBeNull();
  });
});
