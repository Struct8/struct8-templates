// Presigned upload handler for the s3-presigned-upload template.
//
// Invoked through the Lambda Function URL (payload format 2.0). The caller asks
// for an upload slot; this function returns a short-lived presigned PUT URL that
// the browser uses to upload the object straight to S3, without ever holding AWS
// credentials.
//
// It reads:
//   - BUCKET_NAME  (environment variable, injected by the diagram from the bucket id)
//   - key          (query string) the object key to create; defaults to a generated one
//   - contentType  (query string, optional) forces the Content-Type of the upload
//
// The presigned URL is valid for EXPIRES_IN seconds and grants exactly one PUT.

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

const REGION = process.env.AWS_REGION;
const BUCKET_NAME = process.env.BUCKET_NAME;
const EXPIRES_IN = Number(process.env.EXPIRES_IN || "300");

const s3 = new S3Client({ region: REGION });

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Content-Type": "application/json",
};

function reply(statusCode, body) {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

export const handler = async (event) => {
  // Preflight, if it ever reaches the function.
  const method = event?.requestContext?.http?.method;
  if (method === "OPTIONS") {
    return reply(200, { ok: true });
  }

  if (!BUCKET_NAME) {
    return reply(500, { error: "BUCKET_NAME is not set" });
  }

  const qs = event?.queryStringParameters || {};
  const key = qs.key && qs.key.trim() !== "" ? qs.key : `uploads/${randomUUID()}`;
  const contentType = qs.contentType;

  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ...(contentType ? { ContentType: contentType } : {}),
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: EXPIRES_IN });

    return reply(200, {
      uploadUrl,
      bucket: BUCKET_NAME,
      key,
      method: "PUT",
      expiresIn: EXPIRES_IN,
    });
  } catch (err) {
    return reply(500, { error: "failed to sign url", detail: String(err) });
  }
};
