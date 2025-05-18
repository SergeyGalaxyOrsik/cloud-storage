import { Module } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const MINIO_CLIENT = 'MINIO_CLIENT';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  providers: [
    {
      provide: MINIO_CLIENT,
      useFactory: (configService: ConfigService) => {
        return new S3Client({
          endpoint: configService.get('MINIO_ENDPOINT') || 'http://localhost:9000',
          region: 'us-east-1',
          credentials: {
            accessKeyId: configService.get('MINIO_ACCESS_KEY') || 'minioadmin',
            secretAccessKey: configService.get('MINIO_SECRET_KEY') || 'minioadmin123',
          },
          forcePathStyle: true,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [MINIO_CLIENT],
})
export class MinioModule {} 