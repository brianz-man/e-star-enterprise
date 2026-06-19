import { cloudinary } from "../config/cloudinary";
import { ApiError } from "../utils/ApiError";

export interface UploadResult {
  url: string;
  publicId: string;
}

export const uploadProductImage = async (
  filePath: string,
  productSku: string,
): Promise<UploadResult> => {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: `e-star/products/${productSku}`,
    use_filename: true,
    unique_filename: true,
    overwrite: false,
    transformation: [
      {
        width: 800,
        height: 800,
        crop: "limit",
        quality: "auto",
        fetch_format: "auto",
      },
    ],
  });

  return { url: result.secure_url, publicId: result.public_id };
};

export const deleteProductImage = async (publicId: string): Promise<void> => {
  const result = await cloudinary.uploader.destroy(publicId);
  if (result.result !== "ok")
    throw ApiError.internal(`Failed to delete image: ${publicId}`);
};
