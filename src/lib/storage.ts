import { getSupabase } from './supabase';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const BUCKET = 'faces';

// Local filesystem fallback for development
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'faces');

async function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const supabase = getSupabase();

  if (supabase) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(key, buffer, { contentType, upsert: true });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
    return data.publicUrl;
  }

  // Fallback: local filesystem
  await ensureDir(UPLOAD_DIR);
  const filePath = join(UPLOAD_DIR, key);
  const dir = join(UPLOAD_DIR, key.split('/').slice(0, -1).join('/'));
  await ensureDir(dir);
  await writeFile(filePath, buffer);
  return `/uploads/faces/${key}`;
}

export async function deleteFile(key: string): Promise<void> {
  const supabase = getSupabase();

  if (supabase) {
    await supabase.storage.from(BUCKET).remove([key]);
    return;
  }

  // Fallback: local filesystem
  const filePath = join(UPLOAD_DIR, key);
  try {
    await unlink(filePath);
  } catch {
    // File may not exist
  }
}
