import nodemailer, { type Transporter } from 'nodemailer';

export type EmailMessage = {
    to: string;
    subject: string;
    html: string;
    attachments?: { filename: string; content: Buffer; contentType: string; cid: string }[];
};

export interface EmailSender {
    send(message: EmailMessage): Promise<void>;
}

type SmtpConfig = {
    from: string;
    host?: string;
    port?: number;
    user?: string;
    pass?: string;
};

export function createSmtpEmailSender(
    config: SmtpConfig,
    transport: Pick<Transporter, 'sendMail'> = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: { user: config.user, pass: config.pass },
        pool: true,
        maxConnections: 2,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
    }),
): EmailSender {
    return {
        async send(message: EmailMessage) {
            await transport.sendMail({
                from: config.from,
                to: message.to,
                subject: message.subject,
                html: message.html,
                attachments: message.attachments?.map((attachment) => ({
                    filename: attachment.filename,
                    content: attachment.content,
                    contentType: attachment.contentType,
                    cid: attachment.cid,
                })),
            });
        },
    };
}
