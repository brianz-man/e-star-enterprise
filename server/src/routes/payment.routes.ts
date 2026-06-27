import { Router } from "express";
import {
  initiateMpesa,
  mpesaCallback,
  getPaymentStatus,
} from "../controllers/payment.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/auth.middleware";
import { mpesaInitiateSchema } from "../validators/order.validator";

const router = Router();

router.post(
  "/mpesa/initiate",
  authenticate,
  validate(mpesaInitiateSchema),
  initiateMpesa,
);
router.post("/mpesa/callback", mpesaCallback);
router.get("/:orderId/status", authenticate, getPaymentStatus);

export default router;
