import { Router } from "express";
import {
  getDashboard,
  getAllOrders,
  updateOrderStatus,
  getAllUsers,
  getInventory,
  adjustStock,
} from "../controllers/admin.controller";
import { authenticate, requireAdmin } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate";
import { updateOrderStatusSchema } from "../validators/order.validator";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", getDashboard);
router.get("/dashboard", getDashboard);
router.get("/orders", getAllOrders);
router.put(
  "/orders/:id/status",
  validate(updateOrderStatusSchema),
  updateOrderStatus,
);
router.get("/users", getAllUsers);
router.get("/inventory", getInventory);
router.put("/products/:id/stock", adjustStock);

export default router;
