import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  getMe,
  sendVerificationEmail_handler,
  verifyEmail,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/auth.middleware";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/auth.validator";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, getMe);
router.post("/send-verification", authenticate, sendVerificationEmail_handler);
router.post("/verify-email", validate(verifyEmailSchema), verifyEmail);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

export default router;

