// Preconfigured storage helpers for Manus WebDev templates
// Uploads via Forge Server presigned URL to S3 (PUT direct).
// Downloads return /manus-storage/{key} paths served via 307 redirect.

import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ENV } from "./_core/env";

type R2Config = { endpoint: string; accessKeyId: string; secretAccessKey: string; bucket: string; publicBaseUrl: string };

function getR2Config(): R2Config | null {
  const values = [ENV.r2Endpoint, ENV.r2AccessKeyId, ENV.r2SecretAccessKey, ENV.r2Bucket, ENV.r2PublicBaseUrl];
  if (values.every(value => !value)) return null;
  if (values.some(value => !value)) {
    throw new Error("R2 config incomplete: set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and R2_PUBLIC_BASE_URL");
  }
  return {
    endpoint: ENV.r2Endpoint.replace(/\/+$/, ""),
    accessKeyId: ENV.r2AccessKeyId,
    secretAccessKey: ENV.r2SecretAccessKey,
    bucket: ENV.r2Bucket,
    publicBaseUrl: ENV.r2PublicBaseUrl.replace(/\/+$/, ""),
  };
}

function r2Client(config: R2Config) {
  return new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
}

function publicObjectUrl(config: R2Config, key: string) {
  const encodedKey = key.split("/").map(segment => encodeURIComponent(segment)).join("/");
  return `${config.publicBaseUrl}/${encodedKey}`;
}

export function isR2StorageUrl(url: string) {
  const config = getR2Config();
  return Boolean(config && url.startsWith(`${config.publicBaseUrl}/`));
}

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;

  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY",
    );
  }

  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const r2 = getR2Config();
  if (r2) {
    await r2Client(r2).send(new PutObjectCommand({
      Bucket: r2.bucket,
      Key: key,
      Body: data,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }));
    return { key, url: publicObjectUrl(r2, key) };
  }

  const { forgeUrl, forgeKey } = getForgeConfig();
  // 1. Get presigned PUT URL from Forge
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);

  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }

  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");

  // 2. PUT file directly to S3
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });

  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });

  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }

  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const r2 = getR2Config();
  return r2 ? { key, url: publicObjectUrl(r2, key) } : { key, url: `/manus-storage/${key}` };
}

export async function storageDelete(relKey: string): Promise<void> {
  const r2 = getR2Config();
  if (!r2) return;
  await r2Client(r2).send(new DeleteObjectCommand({ Bucket: r2.bucket, Key: normalizeKey(relKey) }));
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = normalizeKey(relKey);

  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);

  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }

  const { url } = (await resp.json()) as { url: string };
  return url;
}
