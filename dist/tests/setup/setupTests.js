"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
globals_1.jest.mock('@services/email.service', () => ({
    sendEmail: globals_1.jest.fn().mockResolvedValue(undefined),
    sendVerificationEmail: globals_1.jest.fn().mockResolvedValue(undefined),
    sendOrgVerificationEmail: globals_1.jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: globals_1.jest.fn().mockResolvedValue(undefined),
    sendPasswordChangedEmail: globals_1.jest.fn().mockResolvedValue(undefined),
    sendTwoFaEnabledEmail: globals_1.jest.fn().mockResolvedValue(undefined),
    sendApplicationConfirmationUser: globals_1.jest.fn().mockResolvedValue(undefined),
    sendApplicationReceivedOrg: globals_1.jest.fn().mockResolvedValue(undefined),
}));
globals_1.jest.spyOn(console, 'log').mockImplementation(() => undefined);
globals_1.jest.spyOn(console, 'info').mockImplementation(() => undefined);
//# sourceMappingURL=setupTests.js.map