import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadFile(file: File): Promise<string> {
  try {
    // If Cloudinary is configured, use it (required for Vercel/Production)
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { resource_type: 'auto', folder: 'social-network' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result!.secure_url);
          }
        ).end(buffer);
      });
    }

    // Fallback to local storage (Dev only)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (e) {
      // already exists
    }

    const uniqueId = uuidv4();
    const extension = file.name.split('.').pop() || 'png';
    const filename = `${uniqueId}.${extension}`;
    const path = join(uploadsDir, filename);

    await writeFile(path, buffer);
    return `/uploads/${filename}`;
  } catch (error) {
    console.error('File upload error:', error);
    throw new Error('Failed to save file');
  }
}

export async function deleteFile(publicUrl: string): Promise<void> {
  try {
    // Handle Cloudinary delete
    if (publicUrl.includes('res.cloudinary.com')) {
      const parts = publicUrl.split('/');
      const filename = parts[parts.length - 1].split('.')[0];
      const publicId = `social-network/${filename}`;
      await cloudinary.uploader.destroy(publicId);
      return;
    }

    // Handle Local delete
    if (!publicUrl.startsWith('/uploads/')) return;
    const filename = publicUrl.replace('/uploads/', '');
    const path = join(process.cwd(), 'public', 'uploads', filename);
    await unlink(path);
  } catch (error) {
    console.error('File delete error:', error);
  }
}
