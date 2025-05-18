import { RegisterDto } from '@app/common';
import { Body, Controller, Get, Post, Req, Res, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from '@app/common/auth/login.dto';
import { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService, private readonly jwtService: JwtService,) {}
    
    @Post('register')
    async register(@Body() registerDto: RegisterDto, @Res() res: Response) {
        const tokens = await this.authService.register(registerDto);
        this.authService.setTokens(res, tokens);
        return res.status(201).json({ message: 'User registered successfully' });
    }

    @Post('login')
    async login(
        @Body() loginDto: LoginDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const tokens = await this.authService.login(loginDto);
        
        // Set cookies
        this.authService.setTokens(res, tokens);
        const decoded = this.jwtService.verify(tokens["accessToken"]);
        console.log('Decoded accessToken: ', decoded)

        return res.status(200).json({ message: 'Login successful', userId: decoded["userId"] });
    }

    @Post('refresh')
    async refresh(@Body() body: { refresh_token: string }, @Res({ passthrough: true }) res: Response) {
        const tokens = await this.authService.refreshToken(body.refresh_token);
        
        this.authService.setTokens(res, tokens);

        return { message: 'Token refreshed successfully' };
    }

    @Get("me")
    async getMe(@Req() req: Request) {
        const token = req.cookies["access_token"]
        console.log("/auth/me api access_token: ", token);
        const user = await this.authService.getMe(token);
        console.log("User: ",user)
        return user
    }
}
