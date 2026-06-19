import { Router } from "express";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "../controllers/cart.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/auth.middleware";
import {
  addToCartSchema,
  updateCartItemSchema,
} from "../validators/cart.validation";

const router = Router();

router.use(authenticate);

router.get("/", getCart);
router.post("/items", validate(addToCartSchema), addToCart);
router.put("/items/:itemId", validate(updateCartItemSchema), updateCartItem);
router.delete("/items/:itemId", removeCartItem);
router.delete("/", clearCart);

export default router;
