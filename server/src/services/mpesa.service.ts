import axios from "axios";
import { format } from "date-fns";
import { env } from "../config/env";

const BASE_URL =
  env.mpesa.env === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

// ---------------------------------------------------------
// PRODUCTION FIXED: Token Cache Variables
// ---------------------------------------------------------
let cachedToken: string | null = null;
let tokenExpiryTime: number = 0; // Epoch timestamp in ms

let pendingTokenRequest: Promise<string> | null = null;

// Safaricom's endpoints sit behind Incapsula/Imperva bot protection.
// These headers make the request look like a normal API client to avoid blocks.
const daraja = axios.create({
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "E-Star-Enterprise/1.0 (+https://e-star.co.ke)",
  },
  timeout: 15_000,
});

/** Prevents raw HTML (like WAF blocks) from dumping into system logs. */
const describeMpesaError = (err: any): string => {
  const status = err?.response?.status;
  const contentType = err?.response?.headers?.["content-type"] as
    | string
    | undefined;
  const body = err?.response?.data;

  const looksLikeHtml =
    (typeof body === "string" && body.trim().startsWith("<")) ||
    (contentType && contentType.includes("text/html"));

  if (looksLikeHtml) {
    return (
      `Blocked by Safaricom's edge/WAF before reaching the Daraja API ` +
      `(HTTP ${status ?? "unknown"}). This usually means the request was flagged ` +
      `as bot traffic or the environment is temporarily unavailable.`
    );
  }

  return (
    body?.errorMessage ||
    body?.ResultDesc ||
    (body ? JSON.stringify(body) : err.message)
  );
};

// ---------------------------------------------------------
// PRODUCTION FIXED: getAccessToken with Cache Strategy
// ---------------------------------------------------------
const getAccessToken = async (): Promise<string> => {
  const now = Date.now();

  if (cachedToken && tokenExpiryTime > now + 120_000) {
    return cachedToken;
  }

  if (pendingTokenRequest) {
    return pendingTokenRequest;
  }

  pendingTokenRequest = (async () => {
    const credentials = Buffer.from(
      `${env.mpesa.consumerKey}:${env.mpesa.consumerSecret}`,
    ).toString("base64");

    try {
      const { data } = await daraja.get(
        `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
        { headers: { Authorization: `Basic ${credentials}` } },
      );

      cachedToken = data.access_token as string;
      const expiresInSeconds = parseInt(data.expires_in, 10) || 3600;
      tokenExpiryTime = Date.now() + expiresInSeconds * 1000;

      return cachedToken;
    } catch (err: any) {
      throw new Error(`M-Pesa auth failed: ${describeMpesaError(err)}`);
    } finally {
      pendingTokenRequest = null;
    }
  })();

  return pendingTokenRequest;
};

export interface STKPushParams {
  phone: string;
  amount: number;
  orderNumber: string;
  orderId: string;
}

export interface STKPushResult {
  checkoutRequestId: string;
  merchantRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
}

export const initiateSTKPush = async (
  params: STKPushParams,
): Promise<STKPushResult> => {
  const token = await getAccessToken();
  const timestamp = format(new Date(), "yyyyMMddHHmmss");
  const password = Buffer.from(
    `${env.mpesa.shortcode}${env.mpesa.passkey}${timestamp}`,
  ).toString("base64");

  const phone = params.phone;

  const callbackBase = `${env.mpesa.apiBaseUrl}/api/v1/payments/mpesa/callback`;
  const callbackUrl = env.mpesa.callbackToken
    ? `${callbackBase}?token=${encodeURIComponent(env.mpesa.callbackToken)}`
    : callbackBase;

  let data: any;
  try {
    const response = await daraja.post(
      `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: env.mpesa.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.ceil(params.amount),
        PartyA: phone,
        PartyB: env.mpesa.shortcode,
        PhoneNumber: phone,
        CallBackURL: callbackUrl,
        AccountReference: params.orderNumber,
        TransactionDesc: `E-Star Order ${params.orderNumber}`,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    data = response.data;
  } catch (err: any) {
    throw new Error(
      `Safaricom STK Push failed (${err?.response?.status ?? "network"}): ${describeMpesaError(err)}`,
    );
  }

  return {
    checkoutRequestId: data.CheckoutRequestID,
    merchantRequestId: data.MerchantRequestID,
    responseCode: data.ResponseCode,
    responseDescription: data.ResponseDescription,
    customerMessage: data.CustomerMessage,
  };
};
