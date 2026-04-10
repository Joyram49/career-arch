"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = authorize;
const apiResponse_1 = require("@utils/apiResponse");
function authorize(...roles) {
    return (req, res, next) => {
        const userRole = getRequestUserRole(req);
        if (userRole === null) {
            (0, apiResponse_1.sendError)(res, 'Unauthorized', 401);
            return;
        }
        if (!roles.includes(userRole)) {
            (0, apiResponse_1.sendError)(res, `Access denied. Required role: ${roles.join(' or ')}`, 403);
            return;
        }
        next();
    };
}
function getRequestUserRole(req) {
    if (!('user' in req))
        return null;
    const maybeUser = req.user;
    if (typeof maybeUser !== 'object' || maybeUser === null || !('role' in maybeUser)) {
        return null;
    }
    const role = maybeUser.role;
    return typeof role === 'string' ? role : null;
}
//# sourceMappingURL=authorize.js.map