import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('JWT Middleware - Request Headers:', req.headers);
      console.log('JWT Middleware - Cookies:', req.cookies);
      
      const accessToken = req.cookies['accessToken'];
      const refreshToken = req.cookies['refresh_token'];

      if (!accessToken && !refreshToken) {
        console.log('JWT Middleware - No access token found');
        throw new UnauthorizedException('No access token provided');
      }

      try {
        // Verify the access token
        if(!accessToken) throw {name: "TokenExpiredError"}
        const decoded = this.jwtService.verify(accessToken);
        console.log('JWT Middleware - Token verified successfully:', decoded);
        req['user'] = decoded;
        next();
      } catch (error) {
        console.log('JWT Middleware - Token verification failed:', error.message);
        // If access token is expired and we have a refresh token
        if (error.name === 'TokenExpiredError' && refreshToken) {
          try {
            console.log('JWT Middleware - Attempting to refresh token');
            // Send message to auth service to refresh the token
            const response = await firstValueFrom(
              this.authClient.send({ cmd: 'auth.refresh' }, { refreshToken })
            );
            console.log("!!!!!!!! Response: ", response)

            if (response.accessToken) {
              console.log('JWT Middleware - Token refresh successful');
              // Set new access token in cookie
              res.cookie('access_token', response.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 15 * 60 * 1000, // 15 minutes
              });

              res.cookie('refresh_token', response.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 15 minutes
              });

              // Verify the new token
              const decoded = this.jwtService.verify(response.accessToken);
              req['user'] = decoded;
              next();
            } else {
              console.log('JWT Middleware - Token refresh failed: No new token received');
              throw new UnauthorizedException('Failed to refresh token');
            }
          } catch (refreshError) {
            console.log('JWT Middleware - Token refresh error:', refreshError.message);
            throw new UnauthorizedException('Invalid refresh token');
          }
        } else {
          throw new UnauthorizedException('Invalid access token');
        }
      }
    } catch (error) {
      console.log('JWT Middleware - Error:', error.message);
      throw new UnauthorizedException(error.message);
    }
  }
} 