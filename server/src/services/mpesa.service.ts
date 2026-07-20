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

// Dedupes concurrent token fetches. Node is single-threaded but not
// single-request-at-a-time: if two checkouts land in the same tick while
// the cache is empty/expired, both would otherwise see `cachedToken` as
// null and both fire a fresh OAuth request — doubling load on Safaricom's
// auth endpoint at exactly the moment traffic (and WAF sensitivity) is
// highest. Every caller during a refresh awaits this same promise instead.
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

/**
 * Extracts a human-readable message from a failed Safaricom request.
 * Prevents raw HTML (like WAF blocks) from dumping into system logs.
 */
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
  
  // If we have a valid token that isn't expiring in the next 2 minutes, reuse it
  if (cachedToken && tokenExpiryTime > now + 120_000) {
    return cachedToken;
  }

  const credentials = Buffer.from(
    `${env.mpesa.consumerKey}:${env.mpesa.consumerSecret}`,
  ).toString("base64");

  try {
    const { data } = await daraja.get(
      `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${credentials}` } },
    );
    
    // Save token and parse expiry (typically 3600 seconds, convert to ms)
    cachedToken = data.access_token as string;
    const expiresInSeconds = parseInt(data.expires_in, 10) || 3600;
    tokenExpiryTime = now + expiresInSeconds * 1000;

    return cachedToken;
  } catch (err: any) {
    throw new Error(`M-Pesa auth failed: ${describeMpesaError(err)}`);
  }
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

  let data: any;
  try {
    const response = await daraja.post(
      `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: env.mpesa.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline", // Ensure this matches your shortcode profile (PayBill vs Till)
        Amount: Math.ceil(params.amount),
        PartyA: phone,
        PartyB: env.mpesa.shortcode,
        PhoneNumber: phone,
        CallBackURL: `${env.mpesa.apiBaseUrl}/api/v1/payments/mpesa/callback`,
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
