import { Controller, Res } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { Payload } from '@nestjs/microservices';
import { FileService } from './file.service';
import { Response } from 'express';
import { ChunkData } from '@app/common/file/chunk-data.type';
import { FileUploadWorkflowParams } from '@app/workflows/types';

@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @MessagePattern({ cmd: 'file.upload' })
  async handleFileUpload(
    @Payload()
    data: {
      file: {
        originalname: string;
        mimetype: string;
        size: number;
        buffer: string; // base64
      };
      userId: string;
    },
  ) {
    console.log(data.file.originalname);
    return this.fileService.saveMetadata(data.file, data.userId);
  }

  @MessagePattern({ cmd: 'file.get' })
  async handleGetFile(@Payload() data: { fileId: string }) {
    return this.fileService.getFile(data.fileId);
  }

  @MessagePattern({ cmd: 'file.getMetadata' })
  async handleGetFilesMetadata(@Payload() data: { userId: string }) {
    return this.fileService.getFilesMetadata(data.userId);
  }

  @MessagePattern({ cmd: 'file.delete' })
  async handleDeleteFile(@Payload() data: { fileId: string }) {
    const result = await this.fileService.deleteFile(data.fileId);
    return result
      ? { message: 'deleted' }
      : { message: 'something went wrong' };
  }

  @MessagePattern({ cmd: 'file.makePublic' })
  async makeFilePublic(@Payload() data: { fileId: string }) {
    const slug = await this.fileService.makePublic(data.fileId);
    return slug;
  }

  @MessagePattern({ cmd: 'file.getBySlug' })
  async getFileBySlug(@Payload() data: { slug: string }) {
    return this.fileService.getFileBySlug(data.slug);
  }

  @MessagePattern({ cmd: 'file.saveChunks' })
  async saveChunks(
    @Payload()
    data: {
      file: FileUploadWorkflowParams['file'];
      userId: string;
      chunks: ChunkData[];
    },
  ) {
    return this.fileService.saveChunks(data.file, data.userId, data.chunks);
  }

  @MessagePattern({ cmd: 'file.getKey' })
  async getKey(
    @Payload() data: { fileKey: string; deviceId: string; userId: string },
  ) {
    const key = await this.fileService.getKey(
      data.fileKey,
      data.deviceId,
      data.userId,
    );
    const chunksCount = await this.fileService.getChunksSize(
      data.fileKey,
      data.userId,
    );
    return { key, chunksCount };
  }
}
