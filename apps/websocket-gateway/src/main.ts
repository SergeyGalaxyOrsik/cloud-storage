// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { WsGateway } from './presence.gateway';
import { createServer } from 'http';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  // Get RABBITMQ_URL from ConfigService
  const RABBITMQ_URL = configService.get('RABBITMQ_URL') || 'amqp://guest:guest@localhost:5672';
  
  // Create and configure the RabbitMQ microservice
  const microservice = app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [RABBITMQ_URL],
      queue: 'websocket_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  // Start the microservice
  await app.startAllMicroservices();
  
  // Get the WebSocket gateway and initialize it
  const wsGateway = app.get(WsGateway);
  const server = createServer();
  wsGateway.init(server);
  
  // Start the HTTP server
  // await new Promise<void>((resolve) => server.listen(3006, resolve));
  console.log('WebSocket server is running on port 3006');
  
  // Start the main application
  await app.listen(3007);
  console.log('HTTP server is running on port 3007');
}

bootstrap().catch((err) => {
  console.error('Failed to start the application:', err);
  process.exit(1);
});
