import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSetting, SETTINGS_KEYS, type S3Config } from "./settings.js";

const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

export interface UploadResult {
  url: string;
}

/**
 * Stores a base64 image and returns its public URL. Uses S3 when configured in
 * Settings; otherwise falls back to local disk (served at /uploads) for local/dev use,
 * so the platform is usable before an S3 bucket is provisioned.
 */
export async function uploadProductImage(base64Data: string, mimeType: string): Promise<UploadResult> {
  const extension = mimeType.split("/")[1] ?? "jpg";
  const filename = `${randomUUID()}.${extension}`;
  const buffer = Buffer.from(base64Data, "base64");

  const s3Config = await getSetting<S3Config>(SETTINGS_KEYS.S3_CONFIG);
  if (s3Config?.bucket && s3Config.accessKeyId && s3Config.secretAccessKey) {
    return uploadToS3(buffer, filename, mimeType, s3Config);
  }

  return uploadToLocalDisk(buffer, filename);
}

async function uploadToS3(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  config: S3Config,
): Promise<UploadResult> {
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });

  const key = `products/${filename}`;
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ACL: "public-read",
    }),
  );

  const base = config.publicBaseUrl?.replace(/\/$/, "") ?? `https://${config.bucket}.s3.${config.region}.amazonaws.com`;
  return { url: `${base}/${key}` };
}

async function uploadToLocalDisk(buffer: Buffer, filename: string): Promise<UploadResult> {
  await mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_UPLOAD_DIR, filename), buffer);
  const publicBase = process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? 4000}`;
  return { url: `${publicBase}/uploads/${filename}` };
}

export { LOCAL_UPLOAD_DIR };
