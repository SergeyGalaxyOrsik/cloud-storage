import { Controller, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { RegisterDto } from '@app/common';
import { LoginDto } from '@app/common/auth/login.dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  getHello(): string {
    return this.authService.getHello();
  }

  @MessagePattern({ cmd: 'auth.register' })
  register(@Payload() data: RegisterDto, @Ctx() context: RmqContext) {
    
    return this.authService.register(data);
  }

  @MessagePattern({ cmd: 'auth.login' })
  login(@Payload() data: LoginDto, @Ctx() context: RmqContext) {
    
    return this.authService.login(data);
  }

  @MessagePattern({ cmd: 'auth.refresh' })
  refresh(@Payload() data: { refreshToken: string }, @Ctx() context: RmqContext) {
    return this.authService.refresh(data.refreshToken);
  }

  @MessagePattern({cmd: "auth.verify"})
  verify(@Payload() data: {token: string}) {
    return this.authService.verify(data.token);
  }

  @MessagePattern({cmd: "auth.device.public-keys"})
  publicKeys(@Payload() data: {userId: string}) {
    return this.authService.publicKeys(data.userId);
  }
}
