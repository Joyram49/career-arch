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
const OrgAuthController = __importStar(require("@controllers/auth/org.auth.controller"));
const authenticate_1 = require("@middlewares/authenticate");
const authorize_1 = require("@middlewares/authorize");
const rateLimiter_1 = require("@middlewares/rateLimiter");
const validate_1 = require("@middlewares/validate");
const asyncHandler_1 = require("@utils/asyncHandler");
const auth_validation_1 = require("@validations/auth.validation");
const express_1 = require("express");
const router = (0, express_1.Router)();
router.post('/register', rateLimiter_1.registerLimiter, (0, validate_1.validate)(auth_validation_1.orgRegisterSchema), (0, asyncHandler_1.asyncHandler)(OrgAuthController.register));
router.post('/login', rateLimiter_1.loginLimiter, (0, validate_1.validate)(auth_validation_1.orgLoginSchema), (0, asyncHandler_1.asyncHandler)(OrgAuthController.login));
router.post('/logout', (0, asyncHandler_1.asyncHandler)(OrgAuthController.logout));
router.post('/refresh-token', (0, asyncHandler_1.asyncHandler)(OrgAuthController.refreshToken));
router.get('/verify-email', (0, validate_1.validate)(auth_validation_1.verifyEmailSchema), (0, asyncHandler_1.asyncHandler)(OrgAuthController.verifyEmail));
router.post('/forgot-password', rateLimiter_1.forgotPasswordLimiter, (0, validate_1.validate)(auth_validation_1.forgotPasswordSchema), (0, asyncHandler_1.asyncHandler)(OrgAuthController.forgotPassword));
router.post('/reset-password', (0, validate_1.validate)(auth_validation_1.resetPasswordSchema), (0, asyncHandler_1.asyncHandler)(OrgAuthController.resetPassword));
router.post('/2fa/validate', (0, validate_1.validate)(auth_validation_1.twoFaValidateSchema), (0, asyncHandler_1.asyncHandler)(OrgAuthController.validateTwoFa));
router.use(authenticate_1.authenticate, (0, authorize_1.authorize)('ORGANIZATION'));
router.get('/me', (0, asyncHandler_1.asyncHandler)(OrgAuthController.getMe));
router.post('/2fa/setup', (0, asyncHandler_1.asyncHandler)(OrgAuthController.setupTwoFa));
router.post('/2fa/verify', (0, validate_1.validate)(auth_validation_1.twoFaVerifySchema), (0, asyncHandler_1.asyncHandler)(OrgAuthController.verifyTwoFa));
exports.default = router;
//# sourceMappingURL=auth.org.routes.js.map