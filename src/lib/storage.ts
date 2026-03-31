import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function uploadFile(file: File): Promise<string> {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const ext = file.name.split('.').pop();
    const filename = `${uuidv4()}.${ext}`;
    
    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch {
      // already exists or error handled by writeFile later
    }

    const path = join(uploadsDir, filename);
    await writeFile(path, buffer);
    
    // Return the public URL
    return `/uploads/${filename}`;
  } catch (error) {
    console.error('File upload error:', error);
    throw new Error('Failed to save file locally');
  }
}

export async function deleteFile(publicUrl: string): Promise<void> {
  try {
    if (!publicUrl.startsWith('/uploads/')) return;
    const filename = publicUrl.replace('/uploads/', '');
    const path = join(process.cwd(), 'public', 'uploads', filename);
    await unlink(path);
  } catch (error) {
    console.error('File delete error:', error);
    // don't throw, just log
  }
}
