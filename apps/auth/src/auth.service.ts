import { RegisterDto } from '@app/common';
import { Injectable } from '@nestjs/common';
import { UsersService } from './users/users.service';
import { Repository } from 'typeorm';
import { User } from './users/users.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from '@app/common/auth/login.dto';
import { UserPub } from './user-pb/user-pb.entity';
import { UserPbService } from './user-pb/user-pb.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly usersService: UsersService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly userPubService: UserPbService,
    @InjectRepository(UserPub)
    private readonly userPubRepository: Repository<UserPub>,
  ) {}


  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
        return null;
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return null;
    }
    return user;
}

async register(dto: RegisterDto) {
  const user:User = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      name: dto.name,
      surname: dto.surname,
  });
  return this.generateTokens({userId: user.id});
}

async login(dto: LoginDto) {
  const user: User = await this.usersService.validateCredantials({
      email: dto.email,
      password: dto.password,
  });
  if(dto.publicKey && dto.deviceId) {
    const userPub = await this.userPubService.findOneByDeviceId(dto.deviceId);
    if(userPub === null) {
      await this.userPubService.create({
        userId: user.id,
        deviceId: dto.deviceId,
        publicKey: dto.publicKey
      })
    }
  }
  return this.generateTokens({userId: user.id});
}

async refresh(token: string) {
  const payload = this.jwt.verify(token);
  if (!payload) {
      throw new Error('Invalid token');
  }
  const user = await this.userRepository.findOne({ where: { id: payload.userId } });
  if (!user) {
      throw new Error('User not found');
  }
  return this.generateTokens({userId: user.id});
}

async verify(token: string) {
  const payload = this.jwt.verify(token);
  if (!payload) {
      throw new Error('Invalid token');
  }
  const user = await this.userRepository.findOne({ where: { id: payload.userId } });
  if (!user) {
      throw new Error('User not found');
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    surname: user.surname
  }
}

async publicKeys(userId: string) {
  const userPub = await this.userPubRepository.find({ where: { userId } });
  return userPub;
}

generateTokens(payload: {userId: string}) {
    const accessToken = this.jwt.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwt.sign(payload, { expiresIn: '7d' });
    return {accessToken, refreshToken};
}
  getHello(): string {
    return 'Hello World!';
  }
}
