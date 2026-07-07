import crypto from "node:crypto";

/** Verifies the `x-line-signature` header against the raw request body using the channel secret. */
export function verifyLineSignature(rawBody: Buffer, signatureHeader: string | undefined, channelSecret: string): boolean {
  if (!signatureHeader) return false;
  const expected = crypto.createHmac("sha256", channelSecret).update(rawBody).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
