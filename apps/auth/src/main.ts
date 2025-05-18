import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);
  const configService = app.get(ConfigService);
  
  // Get RABBITMQ_URL from ConfigService
  const RABBITMQ_URL = configService.get('RABBITMQ_URL') || 'amqp://guest:guest@localhost:5672';
  
  // Create microservice with the config
  const microservice = app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [RABBITMQ_URL],
      queue: 'auth_queue',
      queueOptions: {
        durable: true,
      },
    },
  });
  
  await app.startAllMicroservices();
  console.log('Auth microservice is running');
}
bootstrap();
