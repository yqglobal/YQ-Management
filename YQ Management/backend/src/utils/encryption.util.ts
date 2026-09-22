import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
// In a real production system, this should be a KMS-backed master key or derived securely.
// We fall back to a hash of JWT_SECRET for demonstration if ENCRYPTION_KEY is not provided.
const getEncryptionKey = (): Buffer => {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-secret-key-must-be-32-chars!';
  return crypto.createHash('sha256').update(String(secret)).digest();
};

export const encrypt = (text: string): string => {
  if (!text) return text;
  
  // Return early if already encrypted (prevent double encryption)
  if (text.startsWith('ENC:')) return text;

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: ENC:iv:authTag:encryptedData
  return `ENC:${iv.toString('hex')}:${authTag}:${encrypted}`;
};

export const decrypt = (text: string): string => {
  if (!text || !text.startsWith('ENC:')) return text;

  try {
    const parts = text.split(':');
    if (parts.length !== 4) return text;

    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const encryptedData = parts[3];

    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt data', error);
    return text; // Return original on failure (or maybe throw depending on strictness)
  }
};

export const encryptJson = (obj: any): any => {
  if (!obj) return obj;
  return encrypt(JSON.stringify(obj));
};

export const decryptJson = (text: string): any => {
  if (!text || typeof text !== 'string' || !text.startsWith('ENC:')) return text;
  const decrypted = decrypt(text);
  try {
    return JSON.parse(decrypted);
  } catch (e) {
    return decrypted;
  }
};
