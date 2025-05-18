import { RegisterDto } from '@app/common';
import { LoginDto } from '@app/common/auth/login.dto';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { timeout, firstValueFrom } from 'rxjs';
import { Response, Request} from 'express';

@Injectable()
export class AuthService {
    constructor(
        @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy
    ) {}

    async register(registerDto: RegisterDto) {
        return firstValueFrom(
            this.authClient.send({ cmd: 'auth.register' }, registerDto)
        );
    }

    async login(loginDto: LoginDto) {
        return firstValueFrom(
            this.authClient.send({ cmd: 'auth.login' }, loginDto)
        );
    }

    async refreshToken(refreshToken: string) {
        return firstValueFrom(
            this.authClient.send({ cmd: 'auth.refresh' }, { refreshToken })
        );
    }

    async getMe(token: string) {
        if(token) {
            const user = await firstValueFrom(
                this.authClient.send({cmd: "auth.verify"}, {token: token}).pipe(timeout(1000))
            )
            return user
        }
        return {user: null}
    }

    setTokens(res: Response, tokens: { accessToken: string; refreshToken: string }) {
        res.cookie('access_token', tokens.accessToken, {
            httpOnly: true,
            // secure: process.env.NODE_ENV === 'production',
            secure: false,
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.cookie('refresh_token', tokens.refreshToken, {
            httpOnly: true,
            // secure: process.env.NODE_ENV === 'production',
            secure: false,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
    }
}
