import {
  compareToken,
  extractJti,
  generateAccessToken,
  generateRefreshToken,
  generateSecureToken,
  getExpiryDate,
  getTokenTtl,
  hashToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../src/utils/token';

describe('Token Utilities', () => {
  const payload = {
    sub: 'user-123',
    role: 'USER' as const,
    email: 'test@example.com',
    plan: 'FREE' as const,
  };

  // ── Access Token ──────────────────────────────────────────────────────────
  describe('generateAccessToken', () => {
    it('should generate a valid JWT access token', () => {
      const token = generateAccessToken(payload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include jti in the payload', () => {
      const token = generateAccessToken(payload);
      const decoded = verifyAccessToken(token);
      expect(decoded.jti).toBeDefined();
      expect(typeof decoded.jti).toBe('string');
    });

    it('should include all payload fields', () => {
      const token = generateAccessToken(payload);
      const decoded = verifyAccessToken(token);
      expect(decoded.sub).toBe(payload.sub);
      expect(decoded.role).toBe(payload.role);
      expect(decoded.email).toBe(payload.email);
    });
  });

  // ── Refresh Token ──────────────────────────────────────────────────────────
  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken(payload);
      const decoded = verifyRefreshToken(token);
      expect(decoded.sub).toBe(payload.sub);
    });

    it('should generate different tokens each time', () => {
      const token1 = generateAccessToken(payload);
      const token2 = generateAccessToken(payload);
      expect(token1).not.toBe(token2);
    });
  });

  // ── Verify Access Token ───────────────────────────────────────────────────
  describe('verifyAccessToken', () => {
    it('should throw on invalid token', () => {
      expect(() => verifyAccessToken('invalid.token.here')).toThrow();
    });

    it('should throw on tampered token', () => {
      const token = generateAccessToken(payload);
      const tampered = token.slice(0, -5) + 'xxxxx';
      expect(() => verifyAccessToken(tampered)).toThrow();
    });
  });

  // ── Crypto Helpers ────────────────────────────────────────────────────────
  describe('generateSecureToken', () => {
    it('should generate a 64-character hex string by default', () => {
      const token = generateSecureToken();
      expect(token).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('hashToken and compareToken', () => {
    it('should hash and compare tokens correctly', () => {
      const raw = generateSecureToken();
      const hashed = hashToken(raw);
      expect(compareToken(raw, hashed)).toBe(true);
    });

    it('should fail comparison with wrong token', () => {
      const raw = generateSecureToken();
      const hashed = hashToken(raw);
      const wrong = generateSecureToken();
      expect(compareToken(wrong, hashed)).toBe(false);
    });
  });

  // ── Expiry Helpers ────────────────────────────────────────────────────────
  describe('getExpiryDate', () => {
    it('should parse minutes correctly', () => {
      const expiry = getExpiryDate('15m');
      const diff = expiry.getTime() - Date.now();
      expect(diff).toBeGreaterThan(14 * 60 * 1000);
      expect(diff).toBeLessThan(16 * 60 * 1000);
    });

    it('should parse days correctly', () => {
      const expiry = getExpiryDate('7d');
      const diff = expiry.getTime() - Date.now();
      expect(diff).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
    });

    it('should throw on invalid format', () => {
      expect(() => getExpiryDate('invalid')).toThrow();
    });
  });

  // ── JTI & TTL ─────────────────────────────────────────────────────────────
  describe('extractJti', () => {
    it('should extract jti from valid token', () => {
      const token = generateAccessToken(payload);
      const jti = extractJti(token);
      expect(jti).toBeDefined();
      expect(typeof jti).toBe('string');
    });

    it('should return null for invalid token', () => {
      expect(extractJti('not.a.token')).toBeNull();
    });
  });

  describe('getTokenTtl', () => {
    it('should return remaining TTL in seconds', () => {
      const token = generateAccessToken(payload);
      const ttl = getTokenTtl(token);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(15 * 60);
    });
  });
});
