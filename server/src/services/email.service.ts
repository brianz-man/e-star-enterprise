import axios from "axios";
import { env } from "../config/env";
import logger from "../utils/logger";

/**
 * Sends a transactional email via Resend's REST API.
 *
 * Uses axios directly (already a project dependency) rather than adding the
 * `resend` SDK as a new package — the REST API is a single POST and doesn't
 * need the extra dependency surface.
 *
 * Never throws: email delivery failures are logged but do not block the
 * calling flow (e.g. forgotPassword must still respond success either way,
 * so we don't leak whether an email exists based on timing/errors).
 */
const sendEmail = async (params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> => {
  if (!env.resend.apiKey) {
    // Fail loudly in logs (this is a config problem), but don't throw —
    // callers shouldn't 500 just because email isn't configured yet.
    logger.error(
      { to: params.to, subject: params.subject },
      "RESEND_API_KEY is not set — email was not sent",
    );
    return;
  }

  try {
    await axios.post(
      "https://api.resend.com/emails",
      {
        from: env.resend.emailFrom,
        to: params.to,
        subject: params.subject,
        html: params.html,
      },
      {
        headers: {
          Authorization: `Bearer ${env.resend.apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 10_000,
      },
    );
  } catch (err: any) {
    // Log and swallow — see note above on why this doesn't throw.
    const detail = err?.response?.data || err.message;
    logger.error(
      { to: params.to, subject: params.subject, err: detail },
      "Failed to send email via Resend",
    );
  }
};

export const sendVerificationEmail = async (
  email: string,
  firstName: string,
  token: string,
): Promise<void> => {
  const verifyUrl = `${env.clientUrl[0]}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Verify your E-Star Enterprise account",
    html: `
      <p>Hi ${firstName},</p>
      <p>Thanks for signing up to E-Star Enterprise. Please confirm your email address by clicking the link below:</p>
      <p><a href="${verifyUrl}">Verify my email</a></p>
      <p>This link expires in 24 hours. If you didn't create this account, you can safely ignore this email.</p>
    `,
  });
};

export const sendPasswordResetEmail = async (
  email: string,
  firstName: string,
  token: string,
): Promise<void> => {
  const resetUrl = `${env.clientUrl[0]}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Reset your E-Star Enterprise password",
    html: `
      <p>Hi ${firstName},</p>
      <p>We received a request to reset your password. Click the link below to choose a new one:</p>
      <p><a href="${resetUrl}">Reset my password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password will not be changed.</p>
    `,
  });
};