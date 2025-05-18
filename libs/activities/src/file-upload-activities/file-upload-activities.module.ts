import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileKey } from '../entities/file-keys.entity';
import { FileUploadActivities } from './file-upload.activities';
import { EncryptionModule } from '@app/encryption';
import { MinioModule } from '../minio/minio.module';
import { ClientsModule } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices';
import * as dotenv from 'dotenv';
dotenv.config();

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

@Module({
    imports: [
        TypeOrmModule.forFeature([FileKey]),
        EncryptionModule,
        MinioModule,
        ClientsModule.register([
            {
              name: 'AUTH_SERVICE',
              transport: Transport.RMQ,
              options: {
                urls: [RABBITMQ_URL],
                queue: 'auth_queue',
                queueOptions: {
                  durable: true,
                },
              },
            },
          ]),
    ],
    providers: [FileUploadActivities],
    exports: [FileUploadActivities, TypeOrmModule]
})
export class FileUploadActivitiesModule {}
