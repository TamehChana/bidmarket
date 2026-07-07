import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { buffer } from "node:stream/consumers";
import { put } from "@vercel/blob";
import type { MultipartFile } from "@fastify/multipart";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export function usesBlobStorage() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN?.trim() ||
      process.env.BLOB_STORE_ID?.trim(),
  );
}

function getLocalUploadDir() {
  if (process.env.UPLOAD_DIR) {
    return process.env.UPLOAD_DIR;
  }
  return path.join(process.cwd(), "public", "uploads");
}

export const uploadDir = getLocalUploadDir();

let uploadDirReady: Promise<void> | null = null;

export function ensureUploadDir() {
  if (!uploadDirReady) {
    uploadDirReady = mkdir(uploadDir, { recursive: true }).then(() => undefined);
  }
  return uploadDirReady;
}

export async function saveListingImage(file: MultipartFile) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new Error("Only JPG, PNG, WebP, and GIF images are allowed.");
  }

  const extension = EXTENSION_BY_MIME[file.mimetype];
  if (!extension) {
    throw new Error("Unsupported image type.");
  }

  const filename = `${randomUUID()}${extension}`;

  if (usesBlobStorage()) {
    const fileBuffer = await buffer(file.file);
    const blob = await put(`listings/${filename}`, fileBuffer, {
      access: "public",
      contentType: file.mimetype,
      addRandomSuffix: false,
    });

    return {
      filename,
      publicPath: blob.url,
    };
  }

  await ensureUploadDir();

  const destination = path.join(uploadDir, filename);
  await pipeline(file.file, createWriteStream(destination));

  return {
    filename,
    publicPath: `/uploads/${filename}`,
  };
}
