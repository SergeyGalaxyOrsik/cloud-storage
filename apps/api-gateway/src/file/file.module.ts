import { Module } from '@nestjs/common';
import { FileController } from './file.controller';
import { ClientsModule } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices';
import { FileService } from './file.service';
import { TemporalClientProvider } from './file.providers';
import { S3Client } from '@aws-sdk/client-s3';
import { MINIO_CLIENT } from '@app/activities/minio/minio.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'FILE_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: 'file_queue',
        }
      }
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [FileController],
  providers: [FileService, TemporalClientProvider,
    {
      provide: MINIO_CLIENT,
      useValue: new S3Client({
        endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'minioadmin',
          secretAccessKey: 'minioadmin123',
        },
        forcePathStyle: true,
      }),
    },  
  ],
  exports: [FileService]
})
export class FileModule {}
