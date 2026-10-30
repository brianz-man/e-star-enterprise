import dotenv from "dotenv";
import { assertDistinctSecrets, assertStrongSecret } from "./secrets";
dotenv.config();

const isProd = process.env.NODE_ENV === "production";

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
};

const getCookieSameSite = (): "strict" | "lax" | "none" => {
  const value = process.env.COOKIE_SAME_SITE || (isProd ? "none" : "strict");
  if (value === "strict" || value === "lax" || value === "none") return value;
  throw new Error("COOKIE_SAME_SITE must be strict, lax, or none");
};

export const env = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: (isProd
    ? required("CLIENT_URL")
    : process.env.CLIENT_URL || "http://localhost:5173"
  )
    .split(",")
    .map((url) => url.trim()),
  isDev: !isProd,
  isProd,
  prismaQueryLog: process.env.PRISMA_QUERY_LOG === "true",

  jwt: {
    secret: required("JWT_SECRET"),
    refreshSecret: required("JWT_REFRESH_SECRET"),
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    refreshTtlMs: parseInt(process.env.JWT_REFRESH_TTL_MS || "604800000", 10), // 7 days in milliseconds
  },

  cookie: {
    httpOnly: true,
    secure: isProd,
    sameSite: getCookieSameSite(),
    maxAge: parseInt(process.env.JWT_REFRESH_TTL_MS || "604800000", 10),
  },

  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || "12", 10),

  cloudinary: {
    cloudName: required("CLOUDINARY_CLOUD_NAME"),
    apiKey: required("CLOUDINARY_API_KEY"),
    apiSecret: required("CLOUDINARY_API_SECRET"),
  },

  serveClient: process.env.SERVE_CLIENT === "true",

  mpesa: {
    consumerKey: required("MPESA_CONSUMER_KEY"),
    consumerSecret: required("MPESA_CONSUMER_SECRET"),
    shortcode: required("MPESA_SHORTCODE"),
    passkey: required("MPESA_PASSKEY"),
    env: (process.env.MPESA_ENV || "sandbox") as "sandbox" | "production",
    apiBaseUrl: required("API_BASE_URL"),
    callbackToken:
      process.env.MPESA_CALLBACK_SECRET ||
      process.env.MPESA_CALLBACK_TOKEN ||
      "",
    callbackIps: (process.env.MPESA_CALLBACK_IPS || "")
      .split(",")
      .map((ip) => ip.trim())
      .filter(Boolean),
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY || "",
    emailFrom: process.env.EMAIL_FROM || "orders@e-star.co.ke",
  },
};

assertStrongSecret("JWT_SECRET", env.jwt.secret);
assertStrongSecret("JWT_REFRESH_SECRET", env.jwt.refreshSecret);
assertDistinctSecrets(env.jwt.secret, env.jwt.refreshSecret);

if (env.cookie.sameSite === "none" && !env.cookie.secure) {
  throw new Error("COOKIE_SAME_SITE=none requires NODE_ENV=production");
}

if (
  env.isProd &&
  !env.mpesa.callbackToken &&
  env.mpesa.callbackIps.length === 0
) {
  throw new Error(
    "Production requires MPESA_CALLBACK_SECRET or MPESA_CALLBACK_IPS",
  );
}

if (env.isProd && !env.resend.apiKey) {
  throw new Error("Production requires RESEND_API_KEY for account emails");
}

if (
  env.isProd &&
  env.clientUrl.some((url) => {
    try {
      return new URL(url).protocol !== "https:";
    } catch {
      return true;
    }
  })
) {
  throw new Error("Production CLIENT_URL entries must be valid HTTPS URLs");
}

if (env.isProd && !env.mpesa.apiBaseUrl.startsWith("https://")) {
  throw new Error("Production API_BASE_URL must use HTTPS");
}
