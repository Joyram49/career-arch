"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
exports.sendVerificationEmail = sendVerificationEmail;
exports.sendOrgVerificationEmail = sendOrgVerificationEmail;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
exports.sendPasswordChangedEmail = sendPasswordChangedEmail;
exports.sendTwoFaEnabledEmail = sendTwoFaEnabledEmail;
exports.sendApplicationConfirmationUser = sendApplicationConfirmationUser;
exports.sendApplicationReceivedOrg = sendApplicationReceivedOrg;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const email_1 = require("@config/email");
const env_1 = require("@config/env");
const logger_1 = require("@config/logger");
function loadTemplate(templateName, variables) {
    const basePath = process.env['NODE_ENV'] === 'production'
        ? path_1.default.join(process.cwd(), 'dist')
        : path_1.default.join(process.cwd(), 'src');
    const templatePath = path_1.default.join(basePath, 'templates', 'emails', `${templateName}.html`);
    let html = fs_1.default.readFileSync(templatePath, 'utf-8');
    Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, String(value));
    });
    html = html.replace(/{{APP_NAME}}/g, 'CareerArch');
    html = html.replace(/{{APP_URL}}/g, env_1.env.FRONTEND_URL);
    html = html.replace(/{{SUPPORT_EMAIL}}/g, env_1.env.MAIL_FROM_ADDRESS);
    html = html.replace(/{{YEAR}}/g, new Date().getFullYear().toString());
    return html;
}
async function sendEmail(data) {
    try {
        const html = loadTemplate(data.template, data.variables);
        await email_1.transporter.sendMail({
            ...email_1.defaultMailOptions,
            to: data.to,
            subject: data.subject,
            html,
        });
        logger_1.logger.info(`Email sent: "${data.subject}" → ${data.to}`);
    }
    catch (error) {
        logger_1.logger.error(`Failed to send email to ${data.to}:`, error);
        throw error;
    }
}
async function sendVerificationEmail(email, firstName, verifyUrl) {
    await sendEmail({
        to: email,
        subject: '✅ Verify your CareerArch email address',
        template: 'verify-email',
        variables: { FIRST_NAME: firstName, VERIFY_URL: verifyUrl },
    });
}
async function sendOrgVerificationEmail(email, companyName, verifyUrl) {
    await sendEmail({
        to: email,
        subject: '✅ Verify your CareerArch organization email',
        template: 'verify-email-org',
        variables: { COMPANY_NAME: companyName, VERIFY_URL: verifyUrl },
    });
}
async function sendPasswordResetEmail(email, firstName, resetUrl) {
    await sendEmail({
        to: email,
        subject: '🔑 Reset your CareerArch password',
        template: 'reset-password',
        variables: { FIRST_NAME: firstName, RESET_URL: resetUrl },
    });
}
async function sendPasswordChangedEmail(email, firstName) {
    await sendEmail({
        to: email,
        subject: '🔒 Your CareerArch password was changed',
        template: 'password-changed',
        variables: { FIRST_NAME: firstName },
    });
}
async function sendTwoFaEnabledEmail(email, firstName) {
    await sendEmail({
        to: email,
        subject: '🛡️ Two-factor authentication enabled',
        template: '2fa-enabled',
        variables: { FIRST_NAME: firstName },
    });
}
async function sendApplicationConfirmationUser(email, firstName, jobTitle, companyName, dashboardUrl) {
    await sendEmail({
        to: email,
        subject: `✅ Application submitted — ${jobTitle} at ${companyName}`,
        template: 'application-submitted-user',
        variables: {
            FIRST_NAME: firstName,
            JOB_TITLE: jobTitle,
            COMPANY_NAME: companyName,
            APPLIED_DATE: new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            }),
            DASHBOARD_URL: dashboardUrl,
        },
    });
}
async function sendApplicationReceivedOrg(email, companyName, candidateName, jobTitle, applicationUrl) {
    await sendEmail({
        to: email,
        subject: `📩 New application — ${jobTitle} from ${candidateName}`,
        template: 'application-submitted-org',
        variables: {
            COMPANY_NAME: companyName,
            CANDIDATE_NAME: candidateName,
            JOB_TITLE: jobTitle,
            APPLIED_DATE: new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            }),
            APPLICATION_URL: applicationUrl,
        },
    });
}
//# sourceMappingURL=email.service.js.map