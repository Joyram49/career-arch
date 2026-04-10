"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const apiResponse_1 = require("@utils/apiResponse");
const validate = (schema) => (req, res, next) => {
    const payload = {
        body: req.body,
        query: req.query,
        params: req.params,
        cookies: req.cookies,
    };
    const result = schema.safeParse(payload);
    if (!result.success) {
        const errors = formatZodErrors(result.error);
        (0, apiResponse_1.sendError)(res, 'Validation failed', 400, errors);
        return;
    }
    const parsed = result.data;
    if (parsed.body !== undefined) {
        req.body = parsed.body;
    }
    next();
};
exports.validate = validate;
function formatZodErrors(error) {
    return error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
    }));
}
//# sourceMappingURL=validate.js.map