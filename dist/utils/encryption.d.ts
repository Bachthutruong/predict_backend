/**
 * Encrypts a text string using AES-256-CBC
 * @param text - The text to encrypt
 * @returns The encrypted text in format: iv:encryptedData
 */
export declare function encrypt(text: string): string;
/**
 * Decrypts an encrypted string using AES-256-CBC
 * @param encryptedText - The encrypted text in format: iv:encryptedData
 * @returns The decrypted text
 */
export declare function decrypt(encryptedText: string): string;
/**
 * Checks if a string is encrypted (has the iv:encryptedData format)
 * @param text - The text to check
 * @returns True if the text appears to be encrypted
 */
export declare function isEncrypted(text: string): boolean;
//# sourceMappingURL=encryption.d.ts.map