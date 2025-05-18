import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/users.entity';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { UserPbModule } from './user-pb/user-pb.module';
import { ConfigModule } from '@nestjs/config';


@Module({
  imports: [
  ConfigModule.forRoot({
    isGlobal: true,
  }),
  DatabaseModule,
  UsersModule,
  TypeOrmModule.forFeature([User]),
  JwtModule.register({ secret: 'SECRET', signOptions: { expiresIn: '15m' } }),
  UserPbModule,
],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
