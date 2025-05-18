import { FileKey } from "@app/activities/entities/file-keys.entity";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { createHmac, randomBytes } from "crypto";
import { Repository } from "typeorm";
import * as crypto from 'crypto';

export function generateSymmetricKey(): string {
    return randomBytes(32).toString('base64');
}

export function generateSessionKeys(
    masterKey: Buffer | string,
    count: number,
    keyLength = 32,
  ): Buffer[] {
    const keys: Buffer[] = [];
  
    for (let i = 0; i < count; i++) {
      const hmac = createHmac('sha256', masterKey);
      hmac.update(Buffer.from(`session-key-${i}`));
      const digest = hmac.digest(); // 32 байта (256 бит)
      keys.push(digest.subarray(0, keyLength));
    }
  
    return keys;
  }

export function encrypt(data: Buffer, key: Buffer): Buffer {
    const iv = crypto.randomBytes(16);
    // HMAC-SHA256 already produces 32-byte keys, use them directly
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Return IV + Tag + Encrypted data
    return Buffer.concat([iv, tag, encrypted]);
}

export function decrypt(encryptedData: Buffer, key: Buffer): Buffer {
    // Extract IV (16 bytes) and auth tag (16 bytes) from the beginning
    const iv = encryptedData.subarray(0, 16);
    const tag = encryptedData.subarray(16, 32);
    const data = encryptedData.subarray(32);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]);
}

function derToPem(derBase64: string): string {
    const der = derBase64.match(/.{1,64}/g)?.join('\n');
    return `-----BEGIN PUBLIC KEY-----\n${der}\n-----END PUBLIC KEY-----`;
}

@Injectable()
export class EncryptionService {
    public generateSymmetricKey(): string {
        return generateSymmetricKey();
    }

    public generateSessionKeys(masterKey: Buffer | string, count: number, keyLength = 32): Buffer[] {
        return generateSessionKeys(masterKey, count, keyLength);
    }

    public encrypt(data: Buffer, key: Buffer): Buffer {
        return encrypt(data, key);
    }

    public decrypt(encryptedData: Buffer, key: Buffer): Buffer {
        return decrypt(encryptedData, key);
    }
}
