import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export function generateSignature(paramsToSign: Record<string, string>): string {
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!
  );
  return signature;
}

export function getUploadUrl(): string {
  return `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/auto/upload`;
}

export function getOptimizedUrl(publicId: string, options: {
  width?: number;
  height?: number;
  crop?: string;
  quality?: string;
  format?: string;
} = {}): string {
  const transforms = [];
  if (options.width) transforms.push(`w_${options.width}`);
  if (options.height) transforms.push(`h_${options.height}`);
  if (options.crop) transforms.push(`c_${options.crop}`);
  transforms.push(`q_${options.quality || 'auto'}`);
  transforms.push(`f_${options.format || 'webp'}`);

  const transformStr = transforms.join(',');
  return `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${transformStr}/${publicId}`;
}

export default cloudinary;
