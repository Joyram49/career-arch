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
exports.login = login;
exports.logout = logout;
exports.refreshToken = refreshToken;
exports.getMe = getMe;
const AdminAuthService = __importStar(require("@services/admin.auth.service"));
const apiResponse_1 = require("@utils/apiResponse");
const constants_1 = require("@utils/constants");
async function login(req, res) {
    const body = req.body;
    const result = await AdminAuthService.loginAdmin(body);
    res.cookie(constants_1.COOKIE_NAMES.ACCESS_TOKEN, result.tokens.accessToken, constants_1.ACCESS_COOKIE_OPTIONS);
    res.cookie(constants_1.COOKIE_NAMES.REFRESH_TOKEN, result.tokens.refreshToken, constants_1.REFRESH_COOKIE_OPTIONS);
    return (0, apiResponse_1.sendSuccess)(res, {
        admin: result.admin,
        accessToken: result.tokens.accessToken,
    }, 'Admin login successful');
}
async function logout(req, res) {
    const accessToken = req.headers['authorization']?.slice(7) ??
        req.cookies[constants_1.COOKIE_NAMES.ACCESS_TOKEN] ??
        '';
    const refreshTokenCookie = req.cookies[constants_1.COOKIE_NAMES.REFRESH_TOKEN] ?? '';
    await AdminAuthService.logoutAdmin(accessToken, refreshTokenCookie);
    res.clearCookie(constants_1.COOKIE_NAMES.ACCESS_TOKEN, { path: '/' });
    res.clearCookie(constants_1.COOKIE_NAMES.REFRESH_TOKEN, { path: '/' });
    return (0, apiResponse_1.sendSuccess)(res, null, 'Logged out successfully');
}
async function refreshToken(req, res) {
    const rawRefreshToken = req.cookies[constants_1.COOKIE_NAMES.REFRESH_TOKEN] ?? '';
    const tokens = await AdminAuthService.refreshAdminToken(rawRefreshToken);
    res.cookie(constants_1.COOKIE_NAMES.ACCESS_TOKEN, tokens.accessToken, constants_1.ACCESS_COOKIE_OPTIONS);
    res.cookie(constants_1.COOKIE_NAMES.REFRESH_TOKEN, tokens.refreshToken, constants_1.REFRESH_COOKIE_OPTIONS);
    return (0, apiResponse_1.sendSuccess)(res, { accessToken: tokens.accessToken }, 'Token refreshed');
}
async function getMe(req, res) {
    const { sub } = req.user;
    const admin = await AdminAuthService.getAdminMe(sub);
    return (0, apiResponse_1.sendSuccess)(res, { admin }, 'Admin profile retrieved');
}
//# sourceMappingURL=admin.auth.controller.js.map