import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtMiddleware } from './jwt.middleware';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigModule } from '@nestjs/config';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.register({
      secret: "SECRET",
      signOptions: { expiresIn: '15m' },
    }),
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
  controllers: [AuthController],
  providers: [JwtMiddleware, AuthService],
  exports: [JwtMiddleware, AuthService],
})
export class AuthModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(JwtMiddleware)
      .exclude(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/me', method: RequestMethod.GET },
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'auth/refresh', method: RequestMethod.POST },
        { path: 'file/slug/:slug', method: RequestMethod.GET },
      )
      .forRoutes('*');
  }
}
