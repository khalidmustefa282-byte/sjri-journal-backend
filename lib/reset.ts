import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import { jwtSecret } from './utils';

// Password reset links without any database change:
// the token is signed and contains a fingerprint of the current password hash,
// so it stops working as soon as the password changes (one use only) or after 1 hour.

const PURPOSE = 'password-reset';

function fingerprint(passwordHash: string) {
  return createHash('sha256').update(passwordHash).digest('hex').slice(0, 20);
}

export function createResetToken(user: { id: string; password: string }) {
  return jwt.sign({ sub: user.id, purpose: PURPOSE, pv: fingerprint(user.password) }, jwtSecret(), { expiresIn: '1h' });
}

export function readResetToken(token: string): { userId: string; pv: string } | null {
  try {
    const data = jwt.verify(token, jwtSecret()) as { sub?: string; purpose?: string; pv?: string };
    if (data.purpose !== PURPOSE || !data.sub || !data.pv) return null;
    return { userId: data.sub, pv: data.pv };
  } catch {
    return null;
  }
}

export function fingerprintMatches(passwordHash: string, pv: string) {
  return fingerprint(passwordHash) === pv;
}
