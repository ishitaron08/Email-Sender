import nodemailer from "nodemailer";
import { env } from "../config/environment";
import { logger } from "../config/logger";

/**
 * Builds a Nodemailer transport for Ethereal (fake SMTP).
 *
 * If SMTP_USER is empty we auto-create an Ethereal test account
 * on first call and log the credentials for convenience.
 */
let transportSingleton: nodemailer.Transporter | null = null;

export async function getTransport(): Promise<nodemailer.Transporter> {
  if (transportSingleton) return transportSingleton;

  let user = env.SMTP_USER;
  let pass = env.SMTP_PASS;

  // Auto-provision Ethereal account when credentials are blank
  if (!user) {
    const testAccount = await nodemailer.createTestAccount();
    user = testAccount.user;
    pass = testAccount.pass;
    logger.info(
      { user, pass, web: "https://ethereal.email" },
      "🔧 Auto-created Ethereal account — save these to .env"
    );
  }

  transportSingleton = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false,
    auth: { user, pass },
  });

  // Verify connection on first use
  await transportSingleton.verify();
  logger.info("✉️  SMTP transport verified");

  return transportSingleton;
}

/**
 * Send a single email and return the Ethereal preview URL.
 */
export async function sendMail(options: {
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<{ messageId: string; previewUrl: string | false }> {
  const transport = await getTransport();
  const info = await transport.sendMail(options);

  const previewUrl = nodemailer.getTestMessageUrl(info);
  logger.info(
    { messageId: info.messageId, previewUrl: previewUrl || undefined, to: options.to },
    previewUrl ? "Email dispatched via Ethereal" : "Email sent successfully"
  );

  return { messageId: info.messageId, previewUrl };
}
