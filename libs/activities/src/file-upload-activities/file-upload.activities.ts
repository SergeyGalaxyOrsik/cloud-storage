// file-upload.activities.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileKey } from '../entities/file-keys.entity';
import { Repository } from 'typeorm';
import { FileUploadWorkflowParams } from '@app/workflows/types';
import { AppDataSource } from '../database/data-source';
import { EncryptionService } from '@app/encryption/encryption.service';
import { GetObjectCommand, S3Client, PutObjectCommand, ListBucketsCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { MINIO_CLIENT } from '../minio/minio.module';
import * as zlib from 'zlib';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { timeout } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import { RedisService } from '@app/redis/redis.service';
import { ChunkData } from '@app/common';
import * as dotenv from 'dotenv';
dotenv.config();
const CHUNK_SIZE = 512 * 1024; // 512KB chunks


function derToPem(derBase64: string): string {
  const der = derBase64.match(/.{1,64}/g)?.join('\n');
  return `-----BEGIN PUBLIC KEY-----\n${der}\n-----END PUBLIC KEY-----`;
}

@Injectable()
export class FileUploadActivities {
  constructor(
    @InjectRepository(FileKey)
    private readonly fileKeyRepository: Repository<FileKey>,
    private readonly encryptionService: EncryptionService,
    @Inject(MINIO_CLIENT)
    private readonly s3: S3Client,
    private readonly authClient: ClientProxy,
    private readonly fileClient?: ClientProxy,
    private readonly redisService?: RedisService,
    private readonly websocketClient?: ClientProxy,
  ) {}

  private async getFileFromMinio(bucket: string, key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);
    const stream = response.Body as Readable;

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) =>
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
      );
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
  public async getBufferSize(fileKey: string): Promise<number> {
    const buffer = await this.getFileFromMinio('buffer-storage', fileKey);
    return buffer.length;
  }

  public async chunkBuffer(
    file: FileUploadWorkflowParams['file'],
    userId: string,
    start: number,
    end: number,
  ): Promise<string> {
    const buffer = await this.getFileFromMinio('buffer-storage', file.fileKey);
    const chunk: Buffer = buffer.subarray(start, end);
    await this.redisService?.setChunk(`${file.fileKey}-${start}-${end}`, chunk.toString('base64'))
    return `${file.fileKey}-${start}-${end}`
  }

  public async compressChunks(chunkKey: string): Promise<string> {
    const chunk = await this.redisService?.getChunk(chunkKey);
    await this.redisService?.deleteChunk(chunkKey);
    if (!chunk) {
      throw new Error(`Chunk not found for key: ${chunkKey}`);
    }
    const compressed = zlib.gzipSync(chunk);
    await this.redisService?.setChunk(chunkKey, compressed.toString('base64'))
    return chunkKey;
  }

  public async cipherChunks(
    file: FileUploadWorkflowParams['file'],
    userId: string,
  ): Promise<Buffer[]> {
    const { originalname, mimetype, size, fileKey } = file;
    const filePath = path.join(
      __dirname,
      '..',
      'uploads',
      `${Date.now()}-${originalname}`,
    );
    const buffer = await this.getFileFromMinio('buffer-storage', fileKey);

    const chunksCount = Math.ceil(buffer.length / CHUNK_SIZE);

    const devicePublicKeys = await firstValueFrom(
      this.authClient
        .send({ cmd: 'auth.device.public-keys' }, { userId })
        .pipe(timeout(10000)),
    );
    interface DeviceKey {
      deviceId: string;
      key: string;
    }

    const masterKey = this.encryptionService.generateSymmetricKey();
    let keys: DeviceKey[] = [];

    for (const key of devicePublicKeys) {
      const pemKey = derToPem(key.publicKey);
      const encryptedKey = crypto
        .publicEncrypt(
          {
            key: pemKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          },
          Buffer.from(masterKey),
        )
        .toString('base64');
      let keyObj = {
        deviceId: key.deviceId,
        key: encryptedKey,
      };
      keys.push(keyObj);
    }

    await this.fileKeyRepository.save({
      fileId: file.fileKey,
      userId: userId,
      keys: keys,
    });

    const sessionKeys = this.encryptionService.generateSessionKeys(
      masterKey,
      chunksCount,
    );

    return sessionKeys;
  }

  public async encryptChunk(file: FileUploadWorkflowParams['file'], chunkKey: string, sessionKey: Buffer, index: number) {
    console.log('fileKey:', file.fileKey);
    console.log('index:', index);
    console.log('sessionKey:', Buffer.from(sessionKey));
    const chunk = await this.redisService?.getChunk(chunkKey);
    await this.redisService?.deleteChunk(chunkKey);
    if (!chunk) {
      throw new Error(`Chunk not found for key: ${chunkKey}`);
    }
    const encrypted = this.encryptionService.encrypt(chunk, Buffer.from(sessionKey));
    await this.redisService?.setChunk(`${file.fileKey}-${index}`, encrypted.toString('base64'));
  }

  private async ensureChunksBucketExists(): Promise<void> {
    try {
      // Check if bucket already exists
      const { Buckets } = await this.s3.send(new ListBucketsCommand({}));
      const bucketExists = Buckets?.some(bucket => bucket.Name === 'chunks-storage');
      
      if (!bucketExists) {
        // Create bucket if it doesn't exist
        await this.s3.send(new CreateBucketCommand({
          Bucket: 'chunks-storage'
        }));
        console.log('Created chunks-storage bucket in MinIO');
      }
    } catch (error) {
      console.error('Error ensuring chunks bucket exists:', error);
      throw error;
    }
  }

  public async sendFiles(
    file: FileUploadWorkflowParams['file'],
    userId: string,
    chunksSize: number,
  ): Promise<any> {
    const STORAGE_ROOT = path.resolve(__dirname, '..', 'uploads');
    
    // Ensure the chunks-storage bucket exists
    await this.ensureChunksBucketExists();
    
    const onlineDevices =
      (await this.redisService?.getAllOnlineDevices()) || [];

    console.log('onlineDevices:', onlineDevices);
    
    let chunksData: ChunkData[] = [];

    const totalChunks = chunksSize;
    const deviceCount = onlineDevices.length;

    for (let i = 0; i < totalChunks; i++) {
      const chunk = await this.redisService?.getChunk(`${file.fileKey}-${i}`);  
      const chunkId = `${file.fileKey}-${i}`;
      console.log('chunk', chunk)
      console.log("Math: ", deviceCount * Math.floor(totalChunks / deviceCount) +
      (totalChunks % deviceCount))

      if (
        deviceCount > 0 &&
        i <
          deviceCount
      ) {
        const targetDevice = onlineDevices[i % deviceCount];
        console.log('targetDevice, ', targetDevice)
        if(this.redisService?.isOnline(targetDevice.userId, targetDevice.deviceId)) {
          chunksData.push({
            chunkId,
            deviceId: targetDevice.deviceId,
            userId: targetDevice.userId,
          });
          
          // Ensure the buffer is properly encoded before sending
          let processedBuffer: string | Buffer;
          
          if (!chunk) {
            console.warn(`Chunk is null or undefined for: ${chunkId}`);
            processedBuffer = '';
          } else if (!Buffer.isBuffer(chunk) && typeof chunk !== 'string') {
            console.warn(`Converting non-buffer chunk to buffer: ${typeof chunk}`);
            processedBuffer = Buffer.from(JSON.stringify(chunk)).toString('base64');
          } else if (Buffer.isBuffer(chunk)) {
            processedBuffer = chunk.toString('base64');
          } else {
            // chunk is already a string
            processedBuffer = chunk;
          }
          
          this.websocketClient?.emit('chunk', {
            buffer: processedBuffer,
            chunkId,
            deviceId: targetDevice.deviceId,
            userId: targetDevice.userId,
          });
          console.log('chunk sent to device:', targetDevice.deviceId);
        } else {
          // Store in MinIO instead of filesystem
          if (chunk) {
            const buffer = Buffer.from(chunk);
            // Upload to MinIO
            await this.s3.send(new PutObjectCommand({
              Bucket: 'chunks-storage',
              Key: chunkId,
              Body: buffer
            }));
          }
          chunksData.push({
            chunkId,
            deviceId: 'server',
            userId: 'server',
          });
        }
      } else {
        // Store in MinIO instead of filesystem
        if (chunk) {
          const buffer = Buffer.from(chunk);
          // Upload to MinIO
          await this.s3.send(new PutObjectCommand({
            Bucket: 'chunks-storage',
            Key: chunkId,
            Body: buffer
          }));
        }
        chunksData.push({
          chunkId,
          deviceId: 'server',
          userId: 'server',
        });
      }
    }
    console.log('Sending chunks to file service')
    if (!this.fileClient) {
      throw new Error('File client is not initialized');
    }
    console.log(await firstValueFrom(this.fileClient.send({cmd: 'file.saveChunks'}, {file, userId, chunks: chunksData}).pipe(timeout(1000))));
    console.log('Chunks sent to file service')
    return {message: 'success'}
  }

  public async notifyUserActivity(userId: string, result: any): Promise<void> {
    console.log(`Notifying user ${userId} about result:`, result);
  }
}

const s3Client = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000', // или адрес MinIO в docker-сети
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
  },
  forcePathStyle: true,
});

const authClient = ClientProxyFactory.create({
  transport: Transport.RMQ,
  options: {
    urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
    queue: 'auth_queue',
    queueOptions: { durable: true },
  },
});

const fileClient = ClientProxyFactory.create({
  transport: Transport.RMQ,
  options: {
    urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
    queue: 'file_queue',
    queueOptions: { durable: true },
  },
});

const websocketClient = ClientProxyFactory.create({
  transport: Transport.RMQ,
  options: {
    urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
    queue: 'websocket_queue',
    queueOptions: { durable: true },
  },
});

// Export individual activities for Temporal
export const activities = {
  getBufferSize: async (fileKey: string) => {
    const fileKeyRepository = AppDataSource.getRepository(FileKey);
    const encryptionService = new EncryptionService();
    const activities = new FileUploadActivities(
      fileKeyRepository,
      encryptionService,
      s3Client,
      authClient,
    );
    return activities.getBufferSize(fileKey);
  },
  chunkBuffer: async (
    file: FileUploadWorkflowParams['file'],
    userId: string,
    start: number,
    end: number,
  ) => {
    const fileKeyRepository = AppDataSource.getRepository(FileKey);
    const encryptionService = new EncryptionService();
    const redisService = new RedisService();
    const activities = new FileUploadActivities(
      fileKeyRepository,
      encryptionService,
      s3Client,
      authClient,
      undefined,
      redisService
    );
    return activities.chunkBuffer(file, userId, start, end);
  },
  compressChunks: async (chunkKey: string) => {
    const fileKeyRepository = AppDataSource.getRepository(FileKey);
    const encryptionService = new EncryptionService();
    const redisService = new RedisService();
    const activities = new FileUploadActivities(
      fileKeyRepository,
      encryptionService,
      s3Client,
      authClient,
      undefined,
      redisService
    );
    return activities.compressChunks(chunkKey);
  },
  cipherChunks: async (
    file: FileUploadWorkflowParams['file'],
    userId: string,
  ) => {
    const fileKeyRepository = AppDataSource.getRepository(FileKey);
    const encryptionService = new EncryptionService();
    const redisService = new RedisService();
    const activities = new FileUploadActivities(
      fileKeyRepository,
      encryptionService,
      s3Client,
      authClient,
      undefined,
      redisService
    );
    return activities.cipherChunks(file, userId);
  },
  encryptChunk: async (file: FileUploadWorkflowParams['file'], chunkKey: string, sessionKey: Buffer, index: number) => {
    const fileKeyRepository = AppDataSource.getRepository(FileKey);
    const encryptionService = new EncryptionService();
    const redisService = new RedisService();
    const activities = new FileUploadActivities(
      fileKeyRepository,
      encryptionService,
      s3Client,
      authClient,
      undefined,
      redisService,
    );
    return activities.encryptChunk(file, chunkKey, sessionKey, index);
  },
  sendFiles: async (
    file: FileUploadWorkflowParams['file'],
    userId: string,
    chunksSize: number,
  ) => {
    const fileKeyRepository = AppDataSource.getRepository(FileKey);
    const encryptionService = new EncryptionService();
    const redisService = new RedisService();
    const activities = new FileUploadActivities(
      fileKeyRepository,
      encryptionService,
      s3Client,
      authClient,
      fileClient,
      redisService,
      websocketClient,
    );
    return activities.sendFiles(file, userId, chunksSize);
  },
};
