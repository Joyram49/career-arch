"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSetup = swaggerSetup;
const path_1 = __importDefault(require("path"));
const env_1 = require("@config/env");
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'CareerArch API',
            version: '1.0.0',
            description: 'Industry-standard job portal API — Glassdoor clone. Includes auth, job search, applications, subscriptions, and Stripe payments.',
            contact: {
                name: 'CareerArch Team',
                email: 'support@careerarch.com',
            },
            license: { name: 'MIT' },
        },
        servers: [
            {
                url: env_1.env.API_URL,
                description: env_1.env.NODE_ENV === 'production' ? 'Production' : 'Development',
            },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT access token',
                },
                CookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'access_token',
                },
            },
            responses: {
                UnauthorizedError: {
                    description: 'Access token is missing or invalid',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean', example: false },
                                    message: { type: 'string', example: 'Unauthorized' },
                                },
                            },
                        },
                    },
                },
                ValidationError: {
                    description: 'Validation failed',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean', example: false },
                                    message: {
                                        type: 'string',
                                        example: 'Validation failed',
                                    },
                                    errors: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                field: { type: 'string' },
                                                message: { type: 'string' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        security: [{ BearerAuth: [] }],
    },
    apis: [
        path_1.default.join(__dirname, 'routes', '**', '*.ts'),
        path_1.default.join(__dirname, 'routes', '**', '*.js'),
    ],
};
const swaggerSpec = (0, swagger_jsdoc_1.default)(options);
function swaggerSetup(app) {
    if (env_1.env.NODE_ENV === 'production')
        return;
    app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec, {
        customSiteTitle: 'CareerArch API Docs',
        customCss: '.swagger-ui .topbar { background-color: #1a1a2e; }',
        swaggerOptions: {
            persistAuthorization: true,
            docExpansion: 'none',
            filter: true,
            displayRequestDuration: true,
        },
    }));
    app.get('/api-docs.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
}
//# sourceMappingURL=swagger.js.map