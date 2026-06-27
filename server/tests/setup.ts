/**
 * tests/setup.ts — runs before every test file
 */
import { vi } from "vitest";

// Suppress console.log noise; keep errors/warns visible
vi.spyOn(console, "log").mockImplementation(() => {});

// Seed all env vars from the real .env layout so no test ever
// needs process.env to be set externally.
Object.assign(process.env, {
  PORT: "5000",
  NODE_ENV: "test",
  CLIENT_URL: "http://localhost:5173",
  DATABASE_URL: "postgresql://postgres:password@localhost:5432/estar_test",
  JWT_SECRET: "test-jwt-secret-min-32-chars-long-ok!!",
  JWT_REFRESH_SECRET: "test-refresh-secret-min-32-chars-ok!!",
  JWT_EXPIRES_IN: "15m",
  JWT_REFRESH_EXPIRES_IN: "7d",
  BCRYPT_ROUNDS: "1", // Fast hashing in tests
  CLOUDINARY_CLOUD_NAME: "test-cloud",
  CLOUDINARY_API_KEY: "test-api-key",
  CLOUDINARY_API_SECRET: "test-api-secret",
  MPESA_CONSUMER_KEY: "test-consumer-key",
  MPESA_CONSUMER_SECRET: "test-consumer-secret",
  MPESA_SHORTCODE: "174379",
  MPESA_PASSKEY:
    "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919",
  MPESA_ENV: "sandbox",
  API_BASE_URL: "http://localhost:5000",
  AT_API_KEY: "test-at-key",
  AT_USERNAME: "sandbox",
  AT_SENDER_ID: "E-STAR",
  RESEND_API_KEY: "test-resend-key",
  EMAIL_FROM: "orders@e-star.co.ke",
});
