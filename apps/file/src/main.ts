import { NestFactory } from '@nestjs/core';
import { FileModule } from './file/file.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(FileModule);
  const configService = app.get(ConfigService);
  
  // Get RABBITMQ_URL from ConfigService
  const RABBITMQ_URL = configService.get('RABBITMQ_URL') || 'amqp://guest:guest@localhost:5672';
  
  // Create microservice with the config
  const microservice = app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [RABBITMQ_URL],
      queue: 'file_queue',
      queueOptions: {
        durable: true,
      },
    },
  });
  
  await app.startAllMicroservices();
  console.log('File microservice is running');
}
bootstrap();
