import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

/**
 * AES-256-GCM for secrets at rest (OAuth tokens) and HMAC for signed state,
 * keyed from TOKEN_ENCRYPTION_KEY. Output is base64url: iv.tag.ciphertext.
 */

function keyFrom(secret = process.env.TOKEN_ENCRYPTION_KEY): Buffer {
  if (!secret || secret.length < 16) {
    throw new Error('TOKEN_ENCRYPTION_KEY is missing or too short (16+ characters).');
  }
  return createHash('sha256').update(secret).digest();
}

export function encryptSecret(plain: string, secret?: string): string {
  const key = keyFrom(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, body].map((b) => b.toString('base64url')).join('.');
}

export function decryptSecret(token: string, secret?: string): string {
  const key = keyFrom(secret);
  const [iv, tag, body] = token.split('.').map((p) => Buffer.from(p, 'base64url'));
  if (!iv || !tag || !body) throw new Error('Malformed secret.');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
}

/** `value.signature`, for OAuth state and similar round trips through the browser. */
export function signValue(value: string, secret?: string): string {
  const mac = createHmac('sha256', keyFrom(secret)).update(value).digest('base64url');
  return `${value}.${mac}`;
}

export function verifySignedValue(signed: string, secret?: string): string | null {
  const at = signed.lastIndexOf('.');
  if (at <= 0) return null;
  const value = signed.slice(0, at);
  const mac = Buffer.from(signed.slice(at + 1), 'base64url');
  const expected = createHmac('sha256', keyFrom(secret)).update(value).digest();
  if (mac.length !== expected.length || !timingSafeEqual(mac, expected)) return null;
  return value;
}
