/**
 * End-to-End Encryption Utilities
 * Uses Web Crypto API for client-side encryption
 * 
 * Privacy-first: All encryption happens in the browser
 * Firebase only stores encrypted blobs
 */

// Generate a cryptographic key for encryption/decryption
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256, // 256-bit key
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );
}

// Export key to store in localStorage
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("jwk", key);
  return JSON.stringify(exported);
}

// Import key from localStorage
export async function importKey(keyData: string): Promise<CryptoKey> {
  const jwk = JSON.parse(keyData);
  return await crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Encrypt a message
export async function encryptMessage(
  message: string,
  key: CryptoKey
): Promise<{ encrypted: string; iv: string }> {
  // Generate a random initialization vector
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Convert message to bytes
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    data
  );
  
  // Convert to base64 for storage
  return {
    encrypted: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

// Decrypt a message
export async function decryptMessage(
  encryptedData: string,
  ivData: string,
  key: CryptoKey
): Promise<string> {
  // Convert from base64
  const encrypted = base64ToArrayBuffer(encryptedData);
  const iv = base64ToArrayBuffer(ivData);
  
  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encrypted
  );
  
  // Convert bytes to string
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

// Helper: ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper: Base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Get or create user's encryption key
export async function getUserEncryptionKey(): Promise<CryptoKey> {
  const stored = localStorage.getItem('marco_polo_encryption_key');
  
  if (stored) {
    try {
      return await importKey(stored);
    } catch (error) {
      console.error('Failed to import stored key, generating new one');
    }
  }
  
  // Generate new key
  const key = await generateEncryptionKey();
  const exported = await exportKey(key);
  localStorage.setItem('marco_polo_encryption_key', exported);
  
  return key;
}

// Encrypt custom message for storage
export async function encryptCustomMessage(message: string): Promise<string> {
  const key = await getUserEncryptionKey();
  const { encrypted, iv } = await encryptMessage(message, key);
  
  // Combine encrypted data and IV for storage
  return JSON.stringify({ encrypted, iv });
}

// Decrypt custom message from storage
// Decrypt custom message from storage
export async function decryptCustomMessage(encryptedBlob: string): Promise<string> {
  // Handle empty or undefined
  if (!encryptedBlob) {
    return "";
  }
  
  try {
    // Try to parse as JSON (encrypted format)
    const parsed = JSON.parse(encryptedBlob);
    
    // If it has encrypted and iv properties, it's encrypted
    if (parsed.encrypted && parsed.iv) {
      try {
        const key = await getUserEncryptionKey();
        return await decryptMessage(parsed.encrypted, parsed.iv, key);
      } catch {
        // Decryption failed (different device/key) - return empty so defaults are used
        return "";
      }
    }
    
    // Otherwise, return as-is (plain text)
    return encryptedBlob;
  } catch (error) {
    // Non-JSON legacy/plain values should still be returned as-is.
    return encryptedBlob;
  }
}


// Hash sensitive data (one-way, for lookups)
export async function hashData(data: string, salt?: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataWithSalt = encoder.encode(data + (salt || crypto.getRandomValues(new Uint8Array(16)).toString()));
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataWithSalt);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
