import axios from "axios";
import { format } from "date-fns";
import { env } from "../config/env";

const BASE_URL =
  env.mpesa.env === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

const getAccessToken = async (): Promise<string> => {
  const credentials = Buffer.from(
    `${env.mpesa.consumerKey}:${env.mpesa.consumerSecret}`,
  ).toString("base64");

  try {
    const { data } = await axios.get(
      `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${credentials}` } },
    );
    return data.access_token as string;
  } catch (err: any) {
    const msg = err?.response?.data?.errorMessage || err.message;
    throw new Error(`M-Pesa auth failed: ${msg}`);
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

  // phone is already normalised by payment.controller — do NOT call formatPhone again
  const phone = params.phone;

  let data: any;
  try {
    const response = await axios.post(
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
        CallBackURL: `${env.mpesa.apiBaseUrl}/api/v1/payments/mpesa/callback`,
        AccountReference: params.orderNumber,
        TransactionDesc: `E-Star Order ${params.orderNumber}`,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    data = response.data;
  } catch (err: any) {
    // Surface the exact Safaricom error in logs and API response
    const safaricomError =
      err?.response?.data?.errorMessage ||
      err?.response?.data?.ResultDesc ||
      JSON.stringify(err?.response?.data) ||
      err.message;
    throw new Error(`Safaricom STK Push failed (${err?.response?.status ?? "network"}): ${safaricomError}`);
  }

  return {
    checkoutRequestId: data.CheckoutRequestID,
    merchantRequestId: data.MerchantRequestID,
    responseCode: data.ResponseCode,
    responseDescription: data.ResponseDescription,
    customerMessage: data.CustomerMessage,
  };
};