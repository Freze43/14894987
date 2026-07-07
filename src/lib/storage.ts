import { mkdir, unlink, readdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");
const CLIPS_DIR = path.join(process.cwd(), "data", "clips");

export function getUploadsDir() {
  return UPLOADS_DIR;
}

export function getClipsDir() {
  return CLIPS_DIR;
}

export async function ensureDirectories() {
  if (!existsSync(UPLOADS_DIR)) {
    await mkdir(UPLOADS_DIR, { recursive: true });
  }
  if (!existsSync(CLIPS_DIR)) {
    await mkdir(CLIPS_DIR, { recursive: true });
  }
}

export function getUploadPath(filename: string) {
  return path.join(UPLOADS_DIR, filename);
}

export function getClipPath(filename: string) {
  return path.join(CLIPS_DIR, filename);
}

export async function deleteFile(filePath: string) {
  try {
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  } catch {
    // ignore errors
  }
}

export async function cleanupOldFiles(directory: string, maxAgeMs: number) {
  try {
    if (!existsSync(directory)) return;
    const files = await readdir(directory);
    const now = Date.now();
    for (const file of files) {
      const filePath = path.join(directory, file);
      const { stat } = await import("fs/promises");
      const info = await stat(filePath);
      if (now - info.mtimeMs > maxAgeMs) {
        await unlink(filePath);
      }
    }
  } catch {
    // ignore errors
  }
}
