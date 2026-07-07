import { access, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import Handlebars from "handlebars";
import open from "open";
import { Resend } from "resend";
import { config } from "#config/config";
import { logger } from "#utils/logger";

export class EmailService {
	static instance;

	domain = "reports.arthuriteintegratedgroup.com";
	apiKey = config.resend.apiKey;

	logger = logger;

	resend;

	sender = `no-reply@${this.domain}`;

	/**
	 * @info - Gets Singleton instance
	 * @returns {EmailService}
	 */
	static getInstance() {
		if (!EmailService.instance) {
			EmailService.instance = new EmailService();
		}
		return EmailService.instance;
	}

	/* @todo - `no-reply@${config.server.serverDomain}` */
	constructor() {
		this.resend = new Resend(this.apiKey);
	}

	async getTemplate(template) {
		const templatesDir = path.join(process.cwd(), "src", "emails");
		const pathName = path.join(templatesDir, template, "html.hbs");

		if (!pathName.startsWith(templatesDir + path.sep)) {
			throw new Error(`Invalid template name: ${template}`);
		}

		await access(pathName).catch(() => {
			throw new Error(`Email template ${template} not found.`);
		});
		return await readFile(pathName, "utf-8");
	}

	/**
	 * Compiles and sends an email using the specified template and options.
	 * In development, renders the email as an HTML preview in the browser.
	 *
	 * @param options - {@link EmailOptions} configuration for the email
	 * @param options.template - Template name matching a directory under `src/emails/`
	 * @param options.message - Recipient, subject, and optional cc/bcc/replyTo fields
	 * @param options.locals - Variables passed to the Handlebars template
	 * @param options.identifier - Optional sender prefix (e.g. `notification@domain`)
	 * @param options.bodyMode - Send as `"html"` (default) or `"text"`
	 * @throws {Error} If no template is provided or the template file is not found
	 */
	send = async (options) => {
		console.log(this.domain, this.apiKey, this.sender);
		if (!options.template) throw new Error("Email template is required.");

		const templateContent = await this.getTemplate(options.template);
		const template = Handlebars.compile(templateContent);
		const html = template(options.locals || {});

		const params = {
			from: options.identifier
				? `${options.identifier}@${this.domain}`
				: this.sender,
			to: options.message.to,
			subject: options.message.subject,
			cc: options.message?.cc,
			bcc: options.message?.bcc,
			replyTo: options.message?.replyTo,
		};

		if (options?.bodyMode === "text") {
			params.text = options.message.text;
		} else {
			params.html = html;
		}

		let tmpPath = "";

		try {
			if (config.env === "development") {
				tmpPath = path.join(tmpdir(), `email-preview-${Date.now()}.html`);
				await writeFile(tmpPath, html);
				await open(tmpPath, {});
			} else {
				await this.resend.emails.send(params);
			}

			this.logger.info(`Email sent to ${options.message.to}`);
		} catch (e) {
			this.logger.error(
				`Failed to send email to ${options.message.to}: ${e instanceof Error ? e.message : "Unknown error"}`,
			);
		} finally {
			/** @info - Since we're saving the files in the tempdir we don't need to delete them */
			// setTimeout(() => {
			// 	unlink(tmpPath, (err) => {
			// 		if (err)
			// 			this.logger.error(
			// 				`Failed to delete temp email preview file: ${err instanceof Error ? err.message : "Unknown error"}`,
			// 			);
			// 		else this.logger.info(`Temp email preview file deleted: ${tmpPath}`);
			// 	});
			// }, 5000);
		}
	};
}

const e = EmailService.getInstance();
await e.send({
	template: "welcome",
	locals: {
		name: "Spectra",
	},
	message: {
		to: "sarafasatar@gmail.com",
		subject: "Hi testing",
		bodyMode: "text",
		text: "Hi",
	},
});
