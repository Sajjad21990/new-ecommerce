import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export async function uploadImage(
  file: string, // base64 or URL
  options?: {
    folder?: string;
    transformation?: object;
  }
): Promise<CloudinaryUploadResult> {
  const result = await cloudinary.uploader.upload(file, {
    folder: options?.folder || "cms-ecommerce",
    transformation: options?.transformation || [
      { quality: "auto:good" },
      { fetch_format: "auto" },
    ],
    resource_type: "image",
  });

  return {
    public_id: result.public_id,
    secure_url: result.secure_url,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
}

export async function deleteImage(publicId: string): Promise<boolean> {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch {
    return false;
  }
}

export function getOptimizedUrl(
  publicId: string,
  options?: {
    width?: number;
    height?: number;
    crop?: string;
  }
): string {
  return cloudinary.url(publicId, {
    transformation: [
      { quality: "auto:good" },
      { fetch_format: "auto" },
      ...(options?.width || options?.height
        ? [
            {
              width: options.width,
              height: options.height,
              crop: options.crop || "fill",
            },
          ]
        : []),
    ],
  });
}
