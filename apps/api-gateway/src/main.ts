import { NestFactory } from '@nestjs/core';
import { ApiGatewayModule } from './api-gateway.module';
import { Transport } from '@nestjs/microservices';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule);
  
  // Enable compression for all routes
  app.use(compression());
  
  // Enable cookie parser
  app.use(cookieParser());
  
  // Configure CORS
  app.enableCors({
    origin: 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 3002;
  
  await app.listen(port);
  console.log(`API Gateway is running on port ${port}`);
}
bootstrap();
