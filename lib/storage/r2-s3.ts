import { S3Client } from "@aws-sdk/client-s3";

let client: S3Client | null = null;

export function getR2S3Client(): S3Client {
  if (client) return client;

  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 não configurado: defina R2_ENDPOINT, R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY.",
    );
  }

  client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
  return client;
}
