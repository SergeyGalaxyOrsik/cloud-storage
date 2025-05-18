import { Module } from '@nestjs/common';
import { WsGateway } from './presence.gateway';
import { RedisModule } from '@app/redis/redis.module';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisModule,
    JwtModule.register({
        secret: "SECRET",
        signOptions: { expiresIn: '15m' },
      }),
    ClientsModule.register([
        {
          name: 'AUTH_SERVICE',
          transport: Transport.RMQ,
          options: {
            urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
            queue: 'auth_queue',
            queueOptions: {
              durable: true,
            },
          },
        },
      ]),
  ],
  controllers: [WsGateway],
  providers: [WsGateway],
})
export class AppModule {}
