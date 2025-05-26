import {
  Controller,
  Post,
  UseInterceptors,
  Body,
  UploadedFile,
  Inject,
  Get,
  Query,
  Param,
  Res,
  Header,
  Delete,
  Req,
} from '@nestjs/common';
import { UploadFileDto } from '@app/common/file/upload-file.dto';
import { File as MulterFile } from 'multer';
import { ClientProxy } from '@nestjs/microservices';
import { FileInterceptor } from '@nestjs/platform-express';
import { buffer, firstValueFrom, timeout } from 'rxjs';
import { Request, Response } from 'express';
import { MakePublicDto } from '@app/common/file/make-public.dto';
import { FileService } from './file.service';
import { Client } from '@temporalio/client';
import { FileUploadWorkflow, FileDownloadWorkflow } from '@app/workflows';
import { v4 as uuid } from 'uuid';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

@Controller('file')
export class FileController {
  constructor(
    @Inject('FILE_SERVICE') private readonly fileClient: ClientProxy,
    private readonly fileService: FileService,
    private readonly temporalClient: Client,
    @Inject('MINIO_CLIENT') private readonly s3: S3Client,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: MulterFile,
    @Body() body: UploadFileDto,
  ) {
    console.log(file.originalname);
    const fileKey = uuid();
    const command = new PutObjectCommand({
      Bucket: 'buffer-storage',
      Key: fileKey,
      Body: file.buffer.toString('base64'),
      ContentType: 'application/octet-stream',
    });
    await this.s3.send(command);

    const handle = await this.temporalClient.workflow.start(
      FileUploadWorkflow,
      {
        taskQueue: 'file-upload',
        workflowId: `upload-${uuid()}`,
        args: [
          {
            file: {
              originalname: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              fileKey: fileKey,
            },
            userId: body.userId,
          },
        ],
      },
    );

    console.log(handle);
    return this.fileClient.send({cmd: 'file.upload'}, {
        file: {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer.toString('base64'), // нужно сериализовать
        fileKey: fileKey,
        },
        userId: body.userId,
    }).pipe(timeout(3000))
    return { message: 'success' };
  }

  @Get('/:fileKey/:deviceId')
  async getFileByKey(
    @Param('fileKey') fileKey: string,
    @Param('deviceId') deviceId: string,
    @Req() req,
  ) {
    const response = await this.fileService.getFileByKey(
      fileKey,
      deviceId,
      req.user.userId,
    );

    const metadata = await firstValueFrom(this.fileClient.send({cmd: 'file.get'}, {fileKey: fileKey}).pipe(timeout(1000)));

    const handle = await this.temporalClient.workflow.start(FileDownloadWorkflow, {
        taskQueue: 'file-download',
        workflowId: `download-${uuid()}`,
        args: [{
            fileKey: fileKey,
            userId: req.user.userId,
            deviceId: deviceId,
        }],
      });

    console.log(handle);
    return {
      key: response.key,
      chunksCount: response.chunksCount,
      originalName: metadata.originalName,
      mimeType: metadata.mimeType,
      originalFileSize: metadata.size,
    };
  }

  @Get()
  async getAllFilesData(@Req() req) {
    console.log(req.user);
    return await firstValueFrom(
      this.fileClient
        .send({ cmd: 'file.getMetadata' }, { userId: req.user.userId })
        .pipe(timeout(1000)),
    );
  }

  @Delete('/:fileId')
  async deleteFile(@Param('fileId') fileId: string) {
    return this.fileClient
      .send({ cmd: 'file.delete' }, { fileId })
      .pipe(timeout(1000));
  }

  @Get('preview/:fileId')
  async previewFile(@Param('fileId') fileId: string, @Res() res: Response) {
    console.log('Preview request for fileId:', fileId);

    const fileData = await this.fileClient
      .send({ cmd: 'file.get' }, { fileId })
      .toPromise();
    console.log('File data received:', {
      mimetype: fileData.mimetype,
      size: fileData.size,
      filename: fileData.filename,
      hasBuffer: !!fileData.buffer,
      bufferLength: fileData.buffer?.length,
      bufferType: fileData.buffer ? typeof fileData.buffer : 'undefined',
    });

    if (!fileData.buffer) {
      console.error('No buffer received from file service');
      return res.status(500).send('Error: No file data received');
    }

    // Ensure buffer is actually a Buffer
    const buffer = Buffer.isBuffer(fileData.buffer)
      ? fileData.buffer
      : Buffer.from(fileData.buffer);
    console.log('Processed buffer:', {
      length: buffer.length,
      isBuffer: Buffer.isBuffer(buffer),
    });

    // Set proper headers
    res.setHeader('Content-Type', fileData.mimetype);
    res.setHeader('Content-Length', buffer.length);
    // Properly encode filename for Content-Disposition
    const encodedFilename = encodeURIComponent(fileData.filename);
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodedFilename}`,
    );
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Accept-Ranges', 'bytes');

    console.log('Response headers:', {
      'Content-Type': res.getHeader('Content-Type'),
      'Content-Length': res.getHeader('Content-Length'),
      'Content-Disposition': res.getHeader('Content-Disposition'),
    });

    // Send the buffer
    return res.send(buffer);
  }

  @Get('slug/:slug')
  async previewFilePublic(@Param('slug') slug: string, @Res() res: Response) {
    console.log('Preview request for fileId:', slug);

    const fileData = await firstValueFrom(
      this.fileClient
        .send({ cmd: 'file.getBySlug' }, { slug })
        .pipe(timeout(5000)),
    );
    console.log('File data received:', {
      mimetype: fileData.mimetype,
      size: fileData.size,
      filename: fileData.filename,
      hasBuffer: !!fileData.buffer,
      bufferLength: fileData.buffer?.length,
      bufferType: fileData.buffer ? typeof fileData.buffer : 'undefined',
    });

    if (!fileData.buffer) {
      console.error('No buffer received from file service');
      return res.status(500).send('Error: No file data received');
    }

    // Ensure buffer is actually a Buffer
    const buffer = Buffer.isBuffer(fileData.buffer)
      ? fileData.buffer
      : Buffer.from(fileData.buffer);
    console.log('Processed buffer:', {
      length: buffer.length,
      isBuffer: Buffer.isBuffer(buffer),
    });

    // Set proper headers
    res.setHeader('Content-Type', fileData.mimetype);
    res.setHeader('Content-Length', buffer.length);
    // Properly encode filename for Content-Disposition
    const encodedFilename = encodeURIComponent(fileData.filename);
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodedFilename}`,
    );
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Accept-Ranges', 'bytes');

    console.log('Response headers:', {
      'Content-Type': res.getHeader('Content-Type'),
      'Content-Length': res.getHeader('Content-Length'),
      'Content-Disposition': res.getHeader('Content-Disposition'),
    });

    // Send the buffer
    return res.send(buffer);
  }

  @Get('download/:fileId')
  async downloadFile(@Param('fileId') fileId: string, @Res() res: Response) {
    const fileData = await this.fileClient
      .send({ cmd: 'file.get' }, { fileId })
      .toPromise();

    // Set proper headers
    res.setHeader('Content-Type', fileData.mimetype);
    res.setHeader('Content-Length', fileData.size);
    // Properly encode filename for Content-Disposition
    const encodedFilename = encodeURIComponent(fileData.filename);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodedFilename}`,
    );
    res.setHeader('Cache-Control', 'no-cache');

    // Send the buffer
    return res.send(fileData.buffer);
  }

  @Post('public')
  async makeFilePublic(@Body() dto: MakePublicDto) {
    const link = await firstValueFrom(
      this.fileClient
        .send({ cmd: 'file.makePublic' }, { fileId: dto.fileId })
        .pipe(timeout(50000)),
    );
    return link;
  }
}
