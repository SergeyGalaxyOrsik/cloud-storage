import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { v4 as uuid } from 'uuid';
import { File as MulterFile } from 'multer';
import { Repository } from 'typeorm';
import { File } from './file.entity';
import { firstValueFrom, timeout } from 'rxjs';
import * as path from 'path';
import { nanoid } from 'nanoid';
import { FileUploadWorkflowParams } from '@app/workflows/types';
import { ChunkData } from '@app/common/file/chunk-data.type';
import { FileChunks } from './file-chunks.entity';
import { FileKey } from '@app/activities/entities/file-keys.entity';
@Injectable()
export class FileService {
  constructor(
    @InjectRepository(File) private readonly fileRepo: Repository<File>,
    @InjectRepository(FileChunks)
    private readonly fileChunksRepo: Repository<FileChunks>,
    @InjectRepository(FileKey)
    private readonly fileKeyRepository: Repository<FileKey>,
    @Inject('STORAGE_SERVICE') private readonly client: ClientProxy, // RabbitMQ
  ) {}

  async saveMetadata(
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: string; // base64
    },
    userId: string,
  ): Promise<File> {
    const id = uuid();
    const fileEntity = this.fileRepo.create({
      id,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storagePath: `user-${userId}/${id}`, // virtual path
      userId,
    });

    const saved = await this.fileRepo.save(fileEntity);

    return saved;
  }

  async getFile(fileId: string): Promise<{
    buffer: Buffer;
    filename: string;
    mimetype: string;
    size: number;
  }> {
    // Get file metadata from database
    console.log(`Getting file metadata for ID: ${fileId}`);
    const fileMetadata = await this.fileRepo.findOne({ where: { id: fileId } });
    if (!fileMetadata) {
      throw new Error('File not found');
    }
    console.log('File metadata:', {
      id: fileMetadata.id,
      originalName: fileMetadata.originalName,
      mimeType: fileMetadata.mimeType,
      size: fileMetadata.size,
      storagePath: fileMetadata.storagePath,
    });

    // Get file content from storage service
    console.log('Requesting file content from storage service');
    const response = await firstValueFrom(
      this.client.send('storage.read', fileMetadata.storagePath),
    );
    console.log('Storage service response received:', {
      hasBuffer: !!response.buffer,
      bufferLength: response.buffer?.length,
    });

    // Convert base64 to buffer
    const buffer = Buffer.from(response.buffer, 'base64');
    console.log('Buffer created:', {
      length: buffer.length,
      isBuffer: Buffer.isBuffer(buffer),
    });

    return {
      buffer,
      filename: fileMetadata.originalName,
      mimetype: fileMetadata.mimeType,
      size: fileMetadata.size,
    };
  }

  async getFilesMetadata(userId: string) {
    // Get file metadata from database

    const fileMetadata = await this.fileRepo.find({
      where: { userId: userId },
    });
    if (!fileMetadata) {
      throw new Error('File not found');
    }
    console.log('File metadata:', fileMetadata);

    const formattedMetadata = fileMetadata.map((file) => ({
      id: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      storagePath: file.storagePath,
      createdAt: file.createdAt.toISOString(), // Format the timestamp to ISO string
      isPublic: file.isPublic,
      publicSlug: file.publicSlug || null, // Ensure publicSlug is null if not set
    }));

    return formattedMetadata;
  }

  async deleteFile(fileId: string): Promise<boolean> {
    const fileMetadata = await this.fileRepo.findOne({ where: { id: fileId } });
    const result = await firstValueFrom(
      this.client
        .send('storage.delete', { path: fileMetadata?.storagePath })
        .pipe(timeout(1000)),
    );
    if (result?.success) {
      await this.fileRepo.delete({ id: fileId });
      return true;
    }
    return false;
  }

  // file.service.ts
  async makePublic(fileId: string): Promise<string> {
    const file = await this.fileRepo.findOne({ where: { id: fileId } });
    if (!file) throw new NotFoundException();

    file.isPublic = true;
    file.publicSlug = nanoid(25);

    await this.fileRepo.save(file);
    return file.publicSlug;
  }

  async getFileBySlug(slug: string): Promise<{
    buffer: Buffer;
    filename: string;
    mimetype: string;
    size: number;
  }> {
    // Get file metadata from database
    console.log(`Getting file metadata for Slug: ${slug}`);
    const fileMetadata = await this.fileRepo.findOne({
      where: { publicSlug: slug, isPublic: true },
    });
    if (!fileMetadata) {
      throw new Error('File not found');
    }
    console.log('File metadata:', {
      id: fileMetadata.id,
      originalName: fileMetadata.originalName,
      mimeType: fileMetadata.mimeType,
      size: fileMetadata.size,
      storagePath: fileMetadata.storagePath,
    });

    // Get file content from storage service
    console.log('Requesting file content from storage service');
    const response = await firstValueFrom(
      this.client.send('storage.read', fileMetadata.storagePath),
    );
    console.log('Storage service response received:', {
      hasBuffer: !!response.buffer,
      bufferLength: response.buffer?.length,
    });

    // Convert base64 to buffer
    const buffer = Buffer.from(response.buffer, 'base64');
    console.log('Buffer created:', {
      length: buffer.length,
      isBuffer: Buffer.isBuffer(buffer),
    });

    return {
      buffer,
      filename: fileMetadata.originalName,
      mimetype: fileMetadata.mimeType,
      size: fileMetadata.size,
    };
  }

  async saveChunks(
    file: FileUploadWorkflowParams['file'],
    userId: string,
    chunks: ChunkData[],
  ) {
    console.log('Saving chunks to database');
    const fileChunks = this.fileChunksRepo.create({
      fileId: file.fileKey,
      userId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      chunks,
    });
    await this.fileChunksRepo.save(fileChunks);
    return { message: 'success' };
  }

  async getKey(fileKey: string, deviceId: string, userId: string) {
    const fileKeyRep = await this.fileKeyRepository.findOne({
      where: { fileId: fileKey, userId },
    });
    console.log(fileKeyRep?.keys);
    console.log(
      fileKeyRep?.keys.filter((item) => item.deviceId === deviceId)[0].key,
    );
    return fileKeyRep?.keys.filter((item) => item.deviceId === deviceId)[0].key;
  }

  async getChunksSize(fileKey: string, userId: string) {
    const fileChunksRep = await this.fileChunksRepo.findOne({
      where: { fileId: fileKey, userId },
    });
    console.log(fileChunksRep?.chunks.length);
    return fileChunksRep?.chunks.length;
  }
}
