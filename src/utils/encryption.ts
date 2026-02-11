import crypto from 'crypto';

// Encryption key - trim để tránh space thừa từ .env (ENCRYPTION_KEY= xxx)
const ENCRYPTION_KEY = (process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here!').trim();
const ALGORITHM = 'aes-256-cbc';

// 64 hex chars = 32 bytes; nếu key đúng format thì decode hex
function getKeyBuffer(): Buffer {
  const k = ENCRYPTION_KEY;
  if (/^[0-9a-fA-F]{64}$/.test(k)) {
    return Buffer.from(k, 'hex');
  }
  return Buffer.from(k.padEnd(32, '0').slice(0, 32), 'utf8');
}

/**
 * Encrypts a text string using AES-256-CBC
 * @param text - The text to encrypt
 * @returns The encrypted text in format: iv:encryptedData
 */
export function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getKeyBuffer(), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts an encrypted string using AES-256-CBC
 * @param encryptedText - The encrypted text in format: iv:encryptedData
 * @returns The decrypted text
 */
export function decrypt(encryptedText: string): string {
  try {
    const textParts = encryptedText.split(':');
    if (textParts.length !== 2) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedData = textParts[1];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, getKeyBuffer(), iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    // Không log - một số prediction mã hóa bằng key khác (deploy/env khác)
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Checks if a string is encrypted (has the iv:encryptedData format)
 * @param text - The text to check
 * @returns True if the text appears to be encrypted
 */
export function isEncrypted(text: string): boolean {
  return text.includes(':') && text.split(':').length === 2;
}
