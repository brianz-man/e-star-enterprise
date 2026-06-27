import { Router } from "express";
import multer from "multer";
import {
  getProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadImage,
  deleteImage,
} from "../controllers/product.controller";
import { validate } from "../middlewares/validate";
import { authenticate, requireAdmin } from "../middlewares/auth.middleware";
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from "../validators/product.validator";

const router = Router();

// Multer configuration with file validation
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
  }
};

const upload = multer({
  dest: "uploads/",
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

router.get("/", validate(productQuerySchema, "query"), getProducts);
router.get("/:slug", getProductBySlug);

router.post(
  "/",
  authenticate,
  requireAdmin,
  validate(createProductSchema),
  createProduct,
);
router.put(
  "/:id",
  authenticate,
  requireAdmin,
  validate(updateProductSchema),
  updateProduct,
);
router.delete("/:id", authenticate, requireAdmin, deleteProduct);
router.post(
  "/:id/images",
  authenticate,
  requireAdmin,
  upload.single("image"),
  uploadImage,
);
router.delete("/:id/images/:imageId", authenticate, requireAdmin, deleteImage);

export default router;
