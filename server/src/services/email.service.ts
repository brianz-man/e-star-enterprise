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
}): Promise<boolean> => {
  if (!env.resend.apiKey) {
    // Fail loudly in logs (this is a config problem), but don't throw —
    // callers shouldn't 500 just because email isn't configured yet.
    logger.error(
      { subject: params.subject },
      "RESEND_API_KEY is not set — email was not sent",
    );
    return false;
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
    return true;
  } catch (err: any) {
    // Log and swallow — see note above on why this doesn't throw.
    logger.error(
      {
        subject: params.subject,
        status: err?.response?.status,
        code: err?.code,
      },
      "Failed to send email via Resend",
    );
    return false;
  }
};

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });

const createClientLink = (path: string, token: string): string => {
  const url = new URL(path, env.clientUrl[0]);
  url.searchParams.set("token", token);
  return escapeHtml(url.toString());
};

export const sendVerificationEmail = async (
  email: string,
  firstName: string,
  token: string,
): Promise<boolean> => {
  const verifyUrl = createClientLink("/verify-email", token);
  return sendEmail({
    to: email,
    subject: "Verify your E-Star Enterprise account",
    html: `
      <p>Hi ${escapeHtml(firstName)},</p>
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
): Promise<boolean> => {
  const resetUrl = createClientLink("/reset-password", token);
  return sendEmail({
    to: email,
    subject: "Reset your E-Star Enterprise password",
    html: `
      <p>Hi ${escapeHtml(firstName)},</p>
      <p>We received a request to reset your password. Click the link below to choose a new one:</p>
      <p><a href="${resetUrl}">Reset my password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password will not be changed.</p>
    `,
  });
};
