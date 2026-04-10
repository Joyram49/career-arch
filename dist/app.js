"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("@config/env");
const logger_1 = require("@config/logger");
const errorHandler_1 = require("@middlewares/errorHandler");
const rateLimiter_1 = require("@middlewares/rateLimiter");
const index_1 = __importDefault(require("@routes/index"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const hpp_1 = __importDefault(require("hpp"));
const morgan_1 = __importDefault(require("morgan"));
const swagger_1 = require("./swagger");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
        },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (origin === undefined) {
            callback(null, true);
            return;
        }
        const allowedOrigins = Array.isArray(env_1.env.ALLOWED_ORIGINS)
            ? env_1.env.ALLOWED_ORIGINS
            : [env_1.env.FRONTEND_URL];
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error(`CORS: Origin ${origin} not allowed`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
}));
app.use((0, hpp_1.default)());
app.use(express_1.default.json({ limit: '10kb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10kb' }));
app.use((0, cookie_parser_1.default)());
if (env_1.env.NODE_ENV !== 'test') {
    app.use((0, morgan_1.default)(env_1.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
        stream: logger_1.morganStream,
        skip: (req) => req.url === '/health',
    }));
}
app.set('trust proxy', 1);
app.use(rateLimiter_1.generalLimiter);
(0, swagger_1.swaggerSetup)(app);
app.use(`/api/${env_1.env.API_VERSION}`, index_1.default);
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map