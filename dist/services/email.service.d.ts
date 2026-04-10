import type { IEmailJobData } from '@app-types/index';
export declare function sendEmail(data: IEmailJobData): Promise<void>;
export declare function sendVerificationEmail(email: string, firstName: string, verifyUrl: string): Promise<void>;
export declare function sendOrgVerificationEmail(email: string, companyName: string, verifyUrl: string): Promise<void>;
export declare function sendPasswordResetEmail(email: string, firstName: string, resetUrl: string): Promise<void>;
export declare function sendPasswordChangedEmail(email: string, firstName: string): Promise<void>;
export declare function sendTwoFaEnabledEmail(email: string, firstName: string): Promise<void>;
export declare function sendApplicationConfirmationUser(email: string, firstName: string, jobTitle: string, companyName: string, dashboardUrl: string): Promise<void>;
export declare function sendApplicationReceivedOrg(email: string, companyName: string, candidateName: string, jobTitle: string, applicationUrl: string): Promise<void>;
//# sourceMappingURL=email.service.d.ts.map