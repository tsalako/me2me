import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_VERSION = 1;

function getEncryptionKey() {
  const raw = process.env.CONTENT_ENCRYPTION_KEY || "";
  if (!raw) {
    throw new Error("CONTENT_ENCRYPTION_KEY is not configured.");
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("CONTENT_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }

  return key;
}

export function encryptContent(plaintext) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(String(plaintext), "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    contentCiphertext: ciphertext.toString("base64"),
    contentIv: iv.toString("base64"),
    contentAuthTag: authTag.toString("base64"),
    contentVersion: KEY_VERSION,
  };
}

export function decryptContent(entry) {
  if (!entry?.contentCiphertext || !entry?.contentIv || !entry?.contentAuthTag) {
    return "";
  }

  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(entry.contentIv, "base64")
  );

  decipher.setAuthTag(Buffer.from(entry.contentAuthTag, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(entry.contentCiphertext, "base64")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}