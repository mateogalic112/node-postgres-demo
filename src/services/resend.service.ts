import { env } from "config/env";
import { Resend } from "resend";
import { LoggerService } from "./logger.service";
import { MailService, MailTemplate } from "interfaces/mail.interface";

export class ResendService implements MailService {
  private static instance: ResendService;
  private resend: Resend;

  private constructor() {
    this.resend = new Resend(env.RESEND_API_KEY);
  }

  public static getInstance() {
    if (!ResendService.instance) {
      ResendService.instance = new ResendService();
    }
    return ResendService.instance;
  }

  public async sendEmail({
    to,
    template
  }: {
    to: string;
    template: MailTemplate;
  }): Promise<string | null> {
    if (process.env.NODE_ENV === "test") return null;

    try {
      const { data, error } = await this.resend.emails.send({
        from: env.ADMIN_EMAIL,
        to,
        subject: template.subject,
        html: template.html
      });

      if (error) {
        LoggerService.getInstance().error(error.message);
        return null;
      }

      if (!data?.id) throw new Error("Failed to send email");

      return data.id;
    } catch (error) {
      LoggerService.getInstance().error(String(error));
      return null;
    }
  }
}
