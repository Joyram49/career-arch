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
exports.register = register;
exports.verifyEmail = verifyEmail;
exports.resendVerification = resendVerification;
exports.login = login;
exports.validateTwoFa = validateTwoFa;
exports.logout = logout;
exports.refreshToken = refreshToken;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
exports.setupTwoFa = setupTwoFa;
exports.verifyTwoFa = verifyTwoFa;
exports.disableTwoFa = disableTwoFa;
exports.getMe = getMe;
const UserAuthService = __importStar(require("@services/user.auth.service"));
const apiResponse_1 = require("@utils/apiResponse");
const constants_1 = require("@utils/constants");
async function register(req, res) {
    const result = await UserAuthService.registerUser(req.body);
    return (0, apiResponse_1.sendCreated)(res, null, result.message);
}
async function verifyEmail(req, res) {
    const { token } = req.query;
    const result = await UserAuthService.verifyEmail(token);
    return (0, apiResponse_1.sendSuccess)(res, null, result.message);
}
async function resendVerification(req, res) {
    const { email } = req.body;
    const result = await UserAuthService.resendVerificationEmail(email);
    return (0, apiResponse_1.sendSuccess)(res, null, result.message);
}
async function login(req, res) {
    const body = req.body;
    const result = await UserAuthService.loginUser(body);
    if (result.requires2FA === true) {
        return (0, apiResponse_1.sendSuccess)(res, { requires2FA: true, tempToken: result.tempToken }, 'OTP required');
    }
    if (result.tokens !== undefined) {
        res.cookie(constants_1.COOKIE_NAMES.ACCESS_TOKEN, result.tokens.accessToken, constants_1.ACCESS_COOKIE_OPTIONS);
        res.cookie(constants_1.COOKIE_NAMES.REFRESH_TOKEN, result.tokens.refreshToken, body.rememberMe ? constants_1.REFRESH_COOKIE_OPTIONS_REMEMBER_ME : constants_1.REFRESH_COOKIE_OPTIONS);
    }
    return (0, apiResponse_1.sendSuccess)(res, {
        user: result.user,
        accessToken: result.tokens?.accessToken,
    }, 'Login successful');
}
async function validateTwoFa(req, res) {
    const body = req.body;
    const result = await UserAuthService.validateTwoFa(body);
    res.cookie(constants_1.COOKIE_NAMES.ACCESS_TOKEN, result.tokens.accessToken, constants_1.ACCESS_COOKIE_OPTIONS);
    res.cookie(constants_1.COOKIE_NAMES.REFRESH_TOKEN, result.tokens.refreshToken, constants_1.REFRESH_COOKIE_OPTIONS);
    return (0, apiResponse_1.sendSuccess)(res, {
        user: result.user,
        accessToken: result.tokens.accessToken,
    }, 'Login successful');
}
async function logout(req, res) {
    const accessToken = req.headers['authorization']?.slice(7) ??
        req.cookies[constants_1.COOKIE_NAMES.ACCESS_TOKEN] ??
        '';
    const refreshTokenCookie = req.cookies[constants_1.COOKIE_NAMES.REFRESH_TOKEN] ?? '';
    await UserAuthService.logoutUser(accessToken, refreshTokenCookie);
    res.clearCookie(constants_1.COOKIE_NAMES.ACCESS_TOKEN, { path: '/' });
    res.clearCookie(constants_1.COOKIE_NAMES.REFRESH_TOKEN, { path: '/' });
    return (0, apiResponse_1.sendSuccess)(res, null, 'Logged out successfully');
}
async function refreshToken(req, res) {
    const rawRefreshToken = req.cookies[constants_1.COOKIE_NAMES.REFRESH_TOKEN] ?? '';
    const tokens = await UserAuthService.refreshUserToken(rawRefreshToken);
    res.cookie(constants_1.COOKIE_NAMES.ACCESS_TOKEN, tokens.accessToken, constants_1.ACCESS_COOKIE_OPTIONS);
    res.cookie(constants_1.COOKIE_NAMES.REFRESH_TOKEN, tokens.refreshToken, constants_1.REFRESH_COOKIE_OPTIONS);
    return (0, apiResponse_1.sendSuccess)(res, { accessToken: tokens.accessToken }, 'Token refreshed');
}
async function forgotPassword(req, res) {
    const { email } = req.body;
    const result = await UserAuthService.forgotPassword(email);
    return (0, apiResponse_1.sendSuccess)(res, null, result.message);
}
async function resetPassword(req, res) {
    const body = req.body;
    const result = await UserAuthService.resetPassword(body);
    return (0, apiResponse_1.sendSuccess)(res, null, result.message);
}
async function setupTwoFa(req, res) {
    const { sub } = req.user;
    const result = await UserAuthService.setupTwoFa(sub);
    return (0, apiResponse_1.sendSuccess)(res, result, '2FA setup initiated. Scan the QR code with your authenticator app.');
}
async function verifyTwoFa(req, res) {
    const { sub } = req.user;
    const { otp } = req.body;
    const result = await UserAuthService.verifyAndEnableTwoFa(sub, otp);
    return (0, apiResponse_1.sendSuccess)(res, { backupCodes: result.backupCodes }, result.message);
}
async function disableTwoFa(req, res) {
    const { sub } = req.user;
    const { password, otp } = req.body;
    const result = await UserAuthService.disableTwoFa(sub, password, otp);
    return (0, apiResponse_1.sendSuccess)(res, null, result.message);
}
async function getMe(req, res) {
    const { sub } = req.user;
    const user = await UserAuthService.getUserMe(sub);
    return (0, apiResponse_1.sendSuccess)(res, { user }, 'User profile retrieved');
}
//# sourceMappingURL=user.auth.controller.js.map