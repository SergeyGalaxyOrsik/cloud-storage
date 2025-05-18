import { Module } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
dotenv.config();

export const MINIO_CLIENT = 'MINIO_CLIENT';

@Module({
  providers: [
    {
      provide: MINIO_CLIENT,
      useValue: new S3Client({
        endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
        region: 'us-east-1',
        credentials: {
          accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
          secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
        },
        forcePathStyle: true,
      }),
    },
  ],
  exports: [MINIO_CLIENT],
})
export class MinioModule {} 