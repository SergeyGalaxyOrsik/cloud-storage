import { Module } from '@nestjs/common';
import { ApiGatewayController } from './api-gateway.controller';
import { ApiGatewayService } from './api-gateway.service';
import { AuthController } from './auth/auth.controller';
import { AuthModule } from './auth/auth.module';
import { FileService } from './file/file.service';
import { FileModule } from './file/file.module';
import { ConfigModule } from '@nestjs/config';


@Module({
  imports: [AuthModule, FileModule, ConfigModule.forRoot()],
  controllers: [ApiGatewayController],
  providers: [ApiGatewayService],
})
export class ApiGatewayModule {}
