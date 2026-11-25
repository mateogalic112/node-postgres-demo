export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

export interface MailService {
  sendEmail(payload: EmailPayload): Promise<string | null>;
}
