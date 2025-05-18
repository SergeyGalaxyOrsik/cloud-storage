import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as zlib from 'zlib';

const STORAGE_ROOT = path.resolve(__dirname, '..', 'uploads');

@Injectable()
export class StorageService {
  async saveFile(relativePath: string, base64Buffer: string): Promise<void> {
    const absPath = path.join(STORAGE_ROOT, relativePath);
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    // Compress the buffer using gzip before saving
    const buffer = Buffer.from(base64Buffer, 'base64');
    const compressed = zlib.gzipSync(buffer);
    await fs.writeFile(absPath, compressed);
  }

  async readFile(relativePath: string): Promise<Buffer> {
    const absPath = path.join(STORAGE_ROOT, relativePath);
    // Read and decompress the file
    const compressed = await fs.readFile(absPath);
    const decompressed = zlib.gunzipSync(compressed);
    return decompressed;
  }

  async deleteFile(relativePath: string): Promise<boolean> {
    const absPath = path.join(STORAGE_ROOT, relativePath);
    try {
      await fs.unlink(absPath);
      console.log('File deleted successfully');
      return true
    } catch (err) {
      console.log('Error deleting file: ', err);
      return false
    }
  }
}
