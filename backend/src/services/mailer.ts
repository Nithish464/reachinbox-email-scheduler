import nodemailer, { Transporter } from "nodemailer";
import { Sender } from "../types/domain";

const transportCache = new Map<string, Transporter>();

function getTransport(sender: Sender): Transporter {
  const cached = transportCache.get(sender.id);
  if (cached) return cached;

  const transport = nodemailer.createTransport({
    host: sender.smtpHost,
    port: sender.smtpPort,
    secure: false,
    auth: {
      user: sender.smtpUser,
      pass: sender.smtpPass,
    },
  });

  transportCache.set(sender.id, transport);
  return transport;
}

export async function sendEmail(
  sender: Sender,
  to: string,
  subject: string,
  body: string
): Promise<{ messageId: string; previewUrl?: string }> {
  const transport = getTransport(sender);

  const info = await transport.sendMail({
    from: `"${sender.name}" <${sender.email}>`,
    to,
    subject,
    text: body,
    html: `<div>${body.replace(/\n/g, "<br/>")}</div>`,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
  return { messageId: info.messageId, previewUrl };
}
