"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("@/app"));
const prisma = new client_1.PrismaClient();
describe('User Auth API', () => {
    const testUser = {
        email: 'testuser@example.com',
        password: 'Test@123456',
        firstName: 'Test',
        lastName: 'User',
    };
    afterEach(async () => {
        await prisma.subscription.deleteMany({ where: { user: { email: testUser.email } } });
        await prisma.refreshToken.deleteMany({ where: { user: { email: testUser.email } } });
        await prisma.userProfile.deleteMany({ where: { user: { email: testUser.email } } });
        await prisma.user.deleteMany({ where: { email: testUser.email } });
    });
    afterAll(async () => {
        await prisma.$disconnect();
    });
    describe('POST /api/v1/auth/user/register', () => {
        it('should register a new user successfully', async () => {
            const res = await (0, supertest_1.default)(app_1.default).post('/api/v1/auth/user/register').send(testUser);
            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain('Registration successful');
        });
        it('should reject duplicate email', async () => {
            await (0, supertest_1.default)(app_1.default).post('/api/v1/auth/user/register').send(testUser);
            const res = await (0, supertest_1.default)(app_1.default).post('/api/v1/auth/user/register').send(testUser);
            expect(res.status).toBe(409);
            expect(res.body.success).toBe(false);
        });
        it('should reject weak password', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/auth/user/register')
                .send({ ...testUser, password: '123' });
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.errors).toBeDefined();
        });
        it('should reject invalid email', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/auth/user/register')
                .send({ ...testUser, email: 'not-an-email' });
            expect(res.status).toBe(400);
        });
        it('should reject missing required fields', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/auth/user/register')
                .send({ email: testUser.email });
            expect(res.status).toBe(400);
        });
    });
    describe('POST /api/v1/auth/user/login', () => {
        beforeEach(async () => {
            await (0, supertest_1.default)(app_1.default).post('/api/v1/auth/user/register').send(testUser);
            await prisma.user.update({
                where: { email: testUser.email },
                data: {
                    isEmailVerified: true,
                    emailVerifyToken: null,
                    emailVerifyExpiry: null,
                },
            });
        });
        it('should login successfully with correct credentials', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/auth/user/login')
                .send({ email: testUser.email, password: testUser.password });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.accessToken).toBeDefined();
            expect(res.body.data.user).toBeDefined();
            expect(res.body.data.user.email).toBe(testUser.email);
            expect(res.headers['set-cookie']).toBeDefined();
        });
        it('should reject wrong password', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/auth/user/login')
                .send({ email: testUser.email, password: 'WrongPass@123' });
            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });
        it('should reject unverified email login', async () => {
            await prisma.user.update({
                where: { email: testUser.email },
                data: { isEmailVerified: false },
            });
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/auth/user/login')
                .send({ email: testUser.email, password: testUser.password });
            expect(res.status).toBe(403);
        });
        it('should reject non-existent user', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/auth/user/login')
                .send({ email: 'nobody@example.com', password: testUser.password });
            expect(res.status).toBe(401);
        });
    });
    describe('GET /api/v1/auth/user/me', () => {
        it('should return user profile when authenticated', async () => {
            await (0, supertest_1.default)(app_1.default).post('/api/v1/auth/user/register').send(testUser);
            await prisma.user.update({
                where: { email: testUser.email },
                data: { isEmailVerified: true },
            });
            const loginRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/auth/user/login')
                .send({ email: testUser.email, password: testUser.password });
            const { accessToken } = loginRes.body.data;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/v1/auth/user/me')
                .set('Authorization', `Bearer ${accessToken}`);
            expect(res.status).toBe(200);
            expect(res.body.data.user.email).toBe(testUser.email);
        });
        it('should return 401 without token', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/api/v1/auth/user/me');
            expect(res.status).toBe(401);
        });
    });
    describe('GET /api/v1/health', () => {
        it('should return healthy status', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/api/v1/health');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
//# sourceMappingURL=user.auth.test.js.map