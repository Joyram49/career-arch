import nodemailer from 'nodemailer';
export declare const transporter: nodemailer.Transporter<import("nodemailer/lib/smtp-pool").SentMessageInfo, import("nodemailer/lib/smtp-pool").Options>;
export declare function verifyEmailConnection(): Promise<void>;
export interface IEmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}
export declare const defaultMailOptions: {
    readonly from: `"${string}" <${string}>`;
};
//# sourceMappingURL=email.d.ts.map