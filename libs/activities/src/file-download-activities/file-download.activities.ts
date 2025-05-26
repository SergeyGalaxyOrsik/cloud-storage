// file-upload.activities.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileKey } from '../entities/file-keys.entity';
import { Repository } from 'typeorm';
import { FileDownloadWorkflowParams } from '@app/workflows/types';
import { AppDataSource } from '../database/data-source';
import { EncryptionService } from '@app/encryption/encryption.service';
import { GetObjectCommand, S3Client, ListBucketsCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
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
import { FileChunks } from 'apps/file/src/file/file-chunks.entity';
import * as dotenv from 'dotenv';
dotenv.config();

const CHUNK_SIZE = 512 * 1024; // 512KB chunks

function derToPem(derBase64: string): string {
  const der = derBase64.match(/.{1,64}/g)?.join('\n');
  return `-----BEGIN PUBLIC KEY-----\n${der}\n-----END PUBLIC KEY-----`;
}

@Injectable()
export class FileDownloadActivities {
  constructor(
    @InjectRepository(FileKey)
    private readonly fileKeyRepository: Repository<FileKey>,
    @InjectRepository(FileChunks)
    private readonly fileChunksRepository: Repository<FileChunks>,
    private readonly redisService?: RedisService,
    private readonly websocketClient?: ClientProxy,
    @Inject(MINIO_CLIENT)
    private readonly s3Client?: S3Client,
    @Inject('AUTH_SERVICE')
    private readonly authClient?: ClientProxy,
    @Inject('FILE_SERVICE')
    private readonly fileClient?: ClientProxy,
    private readonly encryptionService?: EncryptionService,
  ) {}

  public async getChunksInfo(fileKey: string, userId: string) {
    const response = await this.fileChunksRepository.findOne({where: {fileId: fileKey, userId}})
    const chunksInfo = response?.chunks
    return chunksInfo
  }

  private async ensureChunksBucketExists(): Promise<void> {
    try {
      if (!this.s3Client) {
        throw new Error('S3 client is not initialized');
      }
      
      // Check if bucket already exists
      const { Buckets } = await this.s3Client.send(new ListBucketsCommand({}));
      const bucketExists = Buckets?.some(bucket => bucket.Name === 'chunks-storage');
      
      if (!bucketExists) {
        // Create bucket if it doesn't exist
        await this.s3Client.send(new CreateBucketCommand({
          Bucket: 'chunks-storage'
        }));
        console.log('Created chunks-storage bucket in MinIO');
      }
    } catch (error) {
      console.error('Error ensuring chunks bucket exists:', error);
      throw error;
    }
  }

  public async downloadChunks(fileKey: string, userId: string, deviceId: string) {
    try {
      // Ensure the chunks-storage bucket exists
      await this.ensureChunksBucketExists();
      
      // 1. Get chunks information from the database
      const chunksInfo = await this.getChunksInfo(fileKey, userId);
      if (!chunksInfo || chunksInfo.length === 0) {
        throw new Error(`No chunks found for file: ${fileKey}`);
      }

      // 2. Get the encryption key for decryption
      if (!this.fileClient) {
        throw new Error('File client is not initialized');
      }
      
      const keyData = await firstValueFrom(
        this.fileClient.send(
          { cmd: 'file.getKey' }, 
          { fileKey, deviceId, userId }
        ).pipe(timeout(10000))
      );

      if (!keyData || !keyData.key) {
        throw new Error(`No encryption key found for file: ${fileKey}`);
      }

      const STORAGE_ROOT = path.resolve(__dirname, '..', 'uploads');
      
      // 3. Process each chunk based on its location (device or server)
      for (const chunkInfo of chunksInfo) {
        const { chunkId, deviceId: chunkDeviceId, userId: chunkUserId } = chunkInfo;
        
        // If chunk is stored on the server, retrieve from MinIO
        if (chunkDeviceId === 'server' && chunkUserId === 'server') {
          try {
            // Retrieve chunk from MinIO instead of filesystem
            if (!this.s3Client) {
              throw new Error('S3 client is not initialized');
            }
            
            const getObjectCommand = new GetObjectCommand({
              Bucket: 'chunks-storage',
              Key: chunkId
            });
            
            const response = await this.s3Client.send(getObjectCommand);
            if (!response.Body) {
              throw new Error(`No data in chunk: ${chunkId}`);
            }
            
            const stream = response.Body as Readable;
            const chunks: Buffer[] = [];
            
            // Convert stream to buffer
            await new Promise<void>((resolve, reject) => {
              stream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
              stream.on('end', () => resolve());
              stream.on('error', reject);
            });
            
            const chunkBuffer = Buffer.concat(chunks);
            
            // 4. Send the chunk to the requesting device via websocket
            if (this.websocketClient) {
              // Ensure the buffer is properly encoded as base64 string
              const base64Buffer = chunkBuffer.toString('base64');
              
              this.websocketClient.emit('chunk', {
                buffer: base64Buffer,
                chunkId,
                deviceId, // Target device that requested the download
                userId,
                isDownload: true, // Flag to indicate this is for download
              });
              console.log(`Server chunk sent to device: ${deviceId}`);
            }
          } catch (error) {
            console.error(`Error reading chunk from MinIO: ${error.message}`);
            continue; // Try next chunk even if this one fails
          }
        } 
        // If chunk is stored on another device, request it
        else if (chunkDeviceId !== 'server') {
          // Check if the source device is online
          const isOnline = await this.redisService?.isOnline(chunkUserId, chunkDeviceId);
          
          if (isOnline) {
            // Request the chunk from the source device
            this.websocketClient?.emit('requestChunk', {
              chunkId,
              sourceDeviceId: chunkDeviceId,
              sourceUserId: chunkUserId,
              targetDeviceId: deviceId,
              targetUserId: userId,
              fileKey,
            });
            console.log(`Requested chunk from device: ${chunkDeviceId}`);
          } else {
            console.error(`Source device ${chunkDeviceId} is offline, cannot retrieve chunk`);
            // Could implement fallback or retry logic here
          }
        }
      }
      
      return { message: 'success', chunksCount: chunksInfo.length };
    } catch (error) {
      console.error(`Error in downloadChunks: ${error.message}`);
      throw error;
    }
  }
}

const websocketClient = ClientProxyFactory.create({
  transport: Transport.RMQ,
  options: {
    urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
    queue: 'websocket_queue',
    queueOptions: { durable: true },
  },
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

const s3Client = new S3Client({
  region: 'us-east-1',
  endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
  },
});

// Export individual activities for Temporal
export const activities = {
  getChunksInfo: async (
    fileKey: FileDownloadWorkflowParams['fileKey'],
    userId: FileDownloadWorkflowParams['userId'],
  ) => {
    const fileKeyRepository = AppDataSource.getRepository(FileKey);
    const fileChunksRepository = AppDataSource.getRepository(FileChunks);
    const activities = new FileDownloadActivities(
        fileKeyRepository,
        fileChunksRepository
    );
    return activities.getChunksInfo(fileKey, userId);
  },

  downloadChunks: async (
    fileKey: FileDownloadWorkflowParams['fileKey'],
    userId: FileDownloadWorkflowParams['userId'],
    deviceId: FileDownloadWorkflowParams['deviceId'],
  ) => {
    const fileKeyRepository = AppDataSource.getRepository(FileKey);
    const fileChunksRepository = AppDataSource.getRepository(FileChunks);
    const redisService = new RedisService();
    const encryptionService = new EncryptionService();
    
    const activities = new FileDownloadActivities(
      fileKeyRepository,
      fileChunksRepository,
      redisService,
      websocketClient,
      s3Client,
      authClient,
      fileClient,
      encryptionService
    );
    
    return activities.downloadChunks(fileKey, userId, deviceId);
  }
};
