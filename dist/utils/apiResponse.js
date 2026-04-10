"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendCreated = sendCreated;
exports.sendNoContent = sendNoContent;
exports.sendError = sendError;
function sendSuccess(res, data, message = 'Success', statusCode = 200, meta) {
    const response = {
        success: true,
        message,
        data,
        ...(meta !== undefined && { meta }),
    };
    return res.status(statusCode).json(response);
}
function sendCreated(res, data, message = 'Created successfully') {
    return sendSuccess(res, data, message, 201);
}
function sendNoContent(res) {
    return res.status(204).send();
}
function sendError(res, message, statusCode = 500, errors = []) {
    const response = {
        success: false,
        message,
        ...(errors.length > 0 && { errors }),
    };
    return res.status(statusCode).json(response);
}
//# sourceMappingURL=apiResponse.js.map