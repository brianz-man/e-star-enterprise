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
  try {
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

    // Validate that Cloudinary actually returned what we need before
    // trusting it downstream (DB write, response to client).
    if (!result?.secure_url || !result?.public_id) {
      throw ApiError.internal(
        "Cloudinary upload succeeded but response was missing url/public ID",
      );
    }

    return { url: result.secure_url, publicId: result.public_id };
  } catch (err) {
    // Don't re-wrap an ApiError we already threw above.
    if (err instanceof ApiError) throw err;

    const message = err instanceof Error ? err.message : "Unknown error";
    throw ApiError.internal(`Cloudinary upload failed: ${message}`);
  }
};

export const deleteProductImage = async (publicId: string): Promise<void> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result !== "ok")
      throw ApiError.internal(`Failed to delete image: ${publicId}`);
  } catch (err) {
    if (err instanceof ApiError) throw err;

    const message = err instanceof Error ? err.message : "Unknown error";
    throw ApiError.internal(
      `Cloudinary delete failed for ${publicId}: ${message}`,
    );
  }
};
