import { config } from "#config/config";
import { EmailProviders } from "#enums/mail/index";
import Email from "email-templates";
import { createTransport } from "nodemailer";
import Handlebars from "handlebars";
import path from "path";

const mail = config.mail;

export class EmailService {
  static instance = null;

  static getInstance() {
    if (!this.instance) {
      this.instance = new EmailService();
    }
    return this.instance;
  }

  getTransport = (provider = EmailProviders.GMAIL) => {
    switch (provider) {
      case EmailProviders.GMAIL:
        return createTransport({
          host: mail.gmail.host,
          port: mail.gmail.port.ssl,
          auth: {
            user: mail.gmail.user,
            pass: mail.gmail.pass,
          },
          secure: mail.gmail.secure,
        });
      case EmailProviders.HOSTINGER:
        return createTransport({
          host: mail.hostinger.host,
          port: mail.hostinger.port.ssl,
          auth: {
            user: mail.hostinger.user,
            pass: mail.hostinger.pass,
          },
          secure: mail.hostinger.secure,
        });
      default:
        throw new Error(`Unknown email provider: ${provider}`);
    }
  }

  /* @todo - `no-reply@${config.server.serverDomain}` */

  constructor(sender = mail.gmail.user ) {
    this.mailService = new Email({
      message: {
        from: sender,
      },
      views: {
        root: "src/emails",
        options: {
          extension: "hbs",
          engineSource: {
            hbs: Handlebars,
          },
        },
      },
      send: config.env !== "development",
      preview: config.env === "development",
      transport: this.getTransport(),
      subjectPrefix: `[${config.env}] `,
    });
  }

  /**
   * @info - Send an email to the recipient
   * @param - options.message.to: string - The recipient email address
   * @param - options.message.subject: string - The subject of the email
   * @param - options.message.text: string - The text content of the email
   * @param - options.message.html: string - The HTML content of the email
   * @param - options.message.attachments: [] - The attachments for the email
   * @param - options.template: string - The template to use for the email
   * @param - options.locals: string - The locale to use for the email
   * @returns {Promise<void>} - A promise that resolves when the email is sent
   */
  send = async (options = { message, template, locals }) => {
    await this.mailService.send({
      ...options,
      locals: options.locals
    })
  }
}