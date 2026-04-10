"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultMailOptions = exports.transporter = void 0;
exports.verifyEmailConnection = verifyEmailConnection;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("./env");
const logger_1 = require("./logger");
exports.transporter = nodemailer_1.default.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    auth: {
        user: 'apikey',
        pass: env_1.env.SENDGRID_API_KEY,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
});
async function verifyEmailConnection() {
    if (env_1.env.NODE_ENV === 'test')
        return;
    try {
        await exports.transporter.verify();
        logger_1.logger.info('✅ Email (SendGrid) transport ready');
    }
    catch (error) {
        logger_1.logger.error('❌ Email transport failed:', error);
    }
}
exports.defaultMailOptions = {
    from: `"${env_1.env.MAIL_FROM_NAME}" <${env_1.env.MAIL_FROM_ADDRESS}>`,
};
//# sourceMappingURL=email.js.map