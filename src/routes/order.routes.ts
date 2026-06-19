import { Router } from "express";
import {
  createOrder,
  getMyOrders,
  getOrderById,
} from "../controllers/order.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/auth.middleware";
import { createOrderSchema } from "../validators/order.validator";

const router = Router();

router.use(authenticate);

router.post("/", validate(createOrderSchema), createOrder);
router.get("/", getMyOrders);
router.get("/:id", getOrderById);

export default router;
