import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// For MVP: local file storage in public/uploads
// Can be swapped to S3/R2/Supabase Storage later
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'faces');

async function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

export async function uploadFile(
  key: string,
  buffer: Buffer,
  _contentType: string
): Promise<string> {
  await ensureDir(UPLOAD_DIR);
  const filePath = join(UPLOAD_DIR, key);
  const dir = join(UPLOAD_DIR, key.split('/').slice(0, -1).join('/'));
  await ensureDir(dir);
  await writeFile(filePath, buffer);
  return `/uploads/faces/${key}`;
}

export async function deleteFile(key: string): Promise<void> {
  const filePath = join(UPLOAD_DIR, key);
  try {
    await unlink(filePath);
  } catch {
    // File may not exist, ignore
  }
}
