import { SignJWT, jwtVerify } from 'jose';

const issuer = 'urn:tourticket:issuer';
const audience = 'urn:tourticket:audience';
const DEFAULT_DEV_SECRET = 'dev-secret-change-me-please-1234567890';
let secret: Uint8Array | null = null;

function getSecretBuffer() {
  if (secret) {
    return secret;
  }

  const rawSecret = process.env.JWT_SECRET;

  if (!rawSecret || rawSecret.length < 32) {
    const warningMessage =
      '[JWT] JWT_SECRET is missing or shorter than 32 characters. Using fallback development secret. Set JWT_SECRET in your environment variables.';

    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be configured with at least 32 characters in production.');
    }
    console.warn(warningMessage);

    secret = new TextEncoder().encode(DEFAULT_DEV_SECRET);
    return secret;
  }

  secret = new TextEncoder().encode(rawSecret);
  return secret;
}

export async function signToken(payload: Record<string, unknown>, options?: { expiresIn?: string }) {
  const expiresAt = options?.expiresIn || '2h';
  const secretBuffer = getSecretBuffer();

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience(audience)
    .setExpirationTime(expiresAt)
    .sign(secretBuffer);
  return token;
}

export async function verifyToken(token: string) {
  const secretBuffer = getSecretBuffer();
  try {
    const { payload } = await jwtVerify(token, secretBuffer, {
      issuer,
      audience,
    });
    return payload;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}
