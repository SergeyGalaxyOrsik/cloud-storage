import { NestFactory } from '@nestjs/core';
import { StorageModule } from './storage.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(StorageModule, {
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
      queue: 'storage_queue',
      queueOptions: {
        durable: false,
      },
    },
  });
  const configService = app.get(ConfigService);
  await app.listen();
}
bootstrap();
