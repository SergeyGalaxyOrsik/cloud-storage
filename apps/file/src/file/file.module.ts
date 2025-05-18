import { Module } from '@nestjs/common';
import { FileService } from './file.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { File } from './file.entity';
import { DatabaseModule } from '../database/database.module';
import { ClientsModule, ClientsModuleOptions, Transport } from '@nestjs/microservices';
import { FileController } from './file.controller';
import { FileChunks } from './file-chunks.entity';
import { FileKey } from '@app/activities/entities/file-keys.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    TypeOrmModule.forFeature([File, FileChunks, FileKey]),
    ClientsModule.register([
      {
        name: 'STORAGE_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: 'storage_queue',
          queueOptions: {
            durable: false
          }
        }
      }
    ]),
  ],
  controllers: [FileController],
  providers: [FileService]
})
export class FileModule {}
