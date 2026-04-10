"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const AdminAuthController = __importStar(require("@controllers/auth/admin.auth.controller"));
const authenticate_1 = require("@middlewares/authenticate");
const authorize_1 = require("@middlewares/authorize");
const rateLimiter_1 = require("@middlewares/rateLimiter");
const validate_1 = require("@middlewares/validate");
const asyncHandler_1 = require("@utils/asyncHandler");
const auth_validation_1 = require("@validations/auth.validation");
const express_1 = require("express");
const router = (0, express_1.Router)();
router.post('/login', rateLimiter_1.loginLimiter, (0, validate_1.validate)(auth_validation_1.adminLoginSchema), (0, asyncHandler_1.asyncHandler)(AdminAuthController.login));
router.post('/logout', (0, asyncHandler_1.asyncHandler)(AdminAuthController.logout));
router.post('/refresh-token', (0, asyncHandler_1.asyncHandler)(AdminAuthController.refreshToken));
router.use(authenticate_1.authenticate, (0, authorize_1.authorize)('ADMIN'));
router.get('/me', (0, asyncHandler_1.asyncHandler)(AdminAuthController.getMe));
exports.default = router;
//# sourceMappingURL=auth.admin.routes.js.map