"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_admin_routes_1 = __importDefault(require("./auth/auth.admin.routes"));
const auth_org_routes_1 = __importDefault(require("./auth/auth.org.routes"));
const auth_user_routes_1 = __importDefault(require("./auth/auth.user.routes"));
const router = (0, express_1.Router)();
router.use('/auth/user', auth_user_routes_1.default);
router.use('/auth/org', auth_org_routes_1.default);
router.use('/auth/admin', auth_admin_routes_1.default);
router.get('/health', (_req, res) => {
    res.json({
        success: true,
        message: 'CareerArch API is running',
        timestamp: new Date().toISOString(),
        version: process.env['npm_package_version'] ?? '1.0.0',
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map