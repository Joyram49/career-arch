"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const token_1 = require("../../src/utils/token");
describe('Token Utilities', () => {
    const payload = {
        sub: 'user-123',
        role: 'USER',
        email: 'test@example.com',
        plan: 'FREE',
    };
    describe('generateAccessToken', () => {
        it('should generate a valid JWT access token', () => {
            const token = (0, token_1.generateAccessToken)(payload);
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3);
        });
        it('should include jti in the payload', () => {
            const token = (0, token_1.generateAccessToken)(payload);
            const decoded = (0, token_1.verifyAccessToken)(token);
            expect(decoded.jti).toBeDefined();
            expect(typeof decoded.jti).toBe('string');
        });
        it('should include all payload fields', () => {
            const token = (0, token_1.generateAccessToken)(payload);
            const decoded = (0, token_1.verifyAccessToken)(token);
            expect(decoded.sub).toBe(payload.sub);
            expect(decoded.role).toBe(payload.role);
            expect(decoded.email).toBe(payload.email);
        });
    });
    describe('generateRefreshToken', () => {
        it('should generate a valid refresh token', () => {
            const token = (0, token_1.generateRefreshToken)(payload);
            const decoded = (0, token_1.verifyRefreshToken)(token);
            expect(decoded.sub).toBe(payload.sub);
        });
        it('should generate different tokens each time', () => {
            const token1 = (0, token_1.generateAccessToken)(payload);
            const token2 = (0, token_1.generateAccessToken)(payload);
            expect(token1).not.toBe(token2);
        });
    });
    describe('verifyAccessToken', () => {
        it('should throw on invalid token', () => {
            expect(() => (0, token_1.verifyAccessToken)('invalid.token.here')).toThrow();
        });
        it('should throw on tampered token', () => {
            const token = (0, token_1.generateAccessToken)(payload);
            const tampered = token.slice(0, -5) + 'xxxxx';
            expect(() => (0, token_1.verifyAccessToken)(tampered)).toThrow();
        });
    });
    describe('generateSecureToken', () => {
        it('should generate a 64-character hex string by default', () => {
            const token = (0, token_1.generateSecureToken)();
            expect(token).toHaveLength(64);
            expect(/^[a-f0-9]+$/.test(token)).toBe(true);
        });
        it('should generate unique tokens', () => {
            const token1 = (0, token_1.generateSecureToken)();
            const token2 = (0, token_1.generateSecureToken)();
            expect(token1).not.toBe(token2);
        });
    });
    describe('hashToken and compareToken', () => {
        it('should hash and compare tokens correctly', () => {
            const raw = (0, token_1.generateSecureToken)();
            const hashed = (0, token_1.hashToken)(raw);
            expect((0, token_1.compareToken)(raw, hashed)).toBe(true);
        });
        it('should fail comparison with wrong token', () => {
            const raw = (0, token_1.generateSecureToken)();
            const hashed = (0, token_1.hashToken)(raw);
            const wrong = (0, token_1.generateSecureToken)();
            expect((0, token_1.compareToken)(wrong, hashed)).toBe(false);
        });
    });
    describe('getExpiryDate', () => {
        it('should parse minutes correctly', () => {
            const expiry = (0, token_1.getExpiryDate)('15m');
            const diff = expiry.getTime() - Date.now();
            expect(diff).toBeGreaterThan(14 * 60 * 1000);
            expect(diff).toBeLessThan(16 * 60 * 1000);
        });
        it('should parse days correctly', () => {
            const expiry = (0, token_1.getExpiryDate)('7d');
            const diff = expiry.getTime() - Date.now();
            expect(diff).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
        });
        it('should throw on invalid format', () => {
            expect(() => (0, token_1.getExpiryDate)('invalid')).toThrow();
        });
    });
    describe('extractJti', () => {
        it('should extract jti from valid token', () => {
            const token = (0, token_1.generateAccessToken)(payload);
            const jti = (0, token_1.extractJti)(token);
            expect(jti).toBeDefined();
            expect(typeof jti).toBe('string');
        });
        it('should return null for invalid token', () => {
            expect((0, token_1.extractJti)('not.a.token')).toBeNull();
        });
    });
    describe('getTokenTtl', () => {
        it('should return remaining TTL in seconds', () => {
            const token = (0, token_1.generateAccessToken)(payload);
            const ttl = (0, token_1.getTokenTtl)(token);
            expect(ttl).toBeGreaterThan(0);
            expect(ttl).toBeLessThanOrEqual(15 * 60);
        });
    });
});
//# sourceMappingURL=token.utils.test.js.map