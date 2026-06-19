import dotenv from "dotenv";
dotenv.config();

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
};

export const env = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  isDev: process.env.NODE_ENV !== "production",

  jwt: {
    secret: required("JWT_SECRET"),
    refreshSecret: required("JWT_REFRESH_SECRET"),
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || "12", 10),

  cloudinary: {
    cloudName: required("CLOUDINARY_CLOUD_NAME"),
    apiKey: required("CLOUDINARY_API_KEY"),
    apiSecret: required("CLOUDINARY_API_SECRET"),
  },

  mpesa: {
    consumerKey: required("MPESA_CONSUMER_KEY"),
    consumerSecret: required("MPESA_CONSUMER_SECRET"),
    shortcode: required("MPESA_SHORTCODE"),
    passkey: required("MPESA_PASSKEY"),
    env: (process.env.MPESA_ENV || "sandbox") as "sandbox" | "production",
    apiBaseUrl: required("API_BASE_URL"),
  },

  africasTalking: {
    apiKey: required("AT_API_KEY"),
    username: required("AT_USERNAME"),
    senderId: process.env.AT_SENDER_ID || "E-STAR",
  },

  resend: {
    apiKey: required("RESEND_API_KEY"),
    emailFrom: process.env.EMAIL_FROM || "orders@e-star.co.ke",
  },
};
