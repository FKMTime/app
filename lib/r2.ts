import "server-only";

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Thin wrapper around Cloudflare R2 (S3-compatible). Keeps env parsing in
// one place and hides the SDK from the rest of the app.
//
// Env:
//   R2_ACCOUNT_ID       — Cloudflare account id (for endpoint URL)
//   R2_BUCKET           — bucket name
//   R2_ACCESS_KEY_ID    — API token access key
//   R2_SECRET_ACCESS_KEY
//   R2_ENDPOINT         — optional override (default: <account>.r2.cloudflarestorage.com)
//   R2_REGION           — optional (default: "auto")

let _client: S3Client | null = null;
let _bucket: string | null = null;

function config(): { client: S3Client; bucket: string } {
  if (_client && _bucket) return { client: _client, bucket: _bucket };
  const bucket = process.env.R2_BUCKET;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 is not configured (R2_BUCKET / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)");
  }
  const endpoint =
    process.env.R2_ENDPOINT ??
    (process.env.R2_ACCOUNT_ID
      ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : null);
  if (!endpoint) {
    throw new Error("R2 endpoint missing (set R2_ENDPOINT or R2_ACCOUNT_ID)");
  }
  _client = new S3Client({
    region: process.env.R2_REGION ?? "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
  _bucket = bucket;
  return { client: _client, bucket };
}

// Upload a buffer or stream. Returns the object key + size.
export async function uploadObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<{ key: string; sizeBytes: number }> {
  const { client, bucket } = config();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return { key, sizeBytes: body.byteLength };
}

// Presigned GET URL for admin downloads. Default TTL: 15 minutes.
export async function presignDownload(
  key: string,
  ttlSeconds = 15 * 60,
): Promise<string> {
  const { client, bucket } = config();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: ttlSeconds },
  );
}
