import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './users.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    private async comparePassword(
        password: string,
        hashedPassword: string,
    ) {
        return await bcrypt.compare(password, hashedPassword);
    }

    async findOneByEmail(email: string): Promise<User | null> {
        return this.userRepository.findOne({where: {email}});
    }

    async validateCredantials({
        email,
        password
    }: {
        email:string,
        password:string
    }): Promise<User> {
        const user = await this.findOneByEmail(email);
        if (!user) {
            throw new HttpException('User not found', 404);    
        }

        const areEqual = await this.comparePassword(password, user.password);
        if (!areEqual) {
            throw new HttpException('Invalid credentials', 401);
        }
        return user;
    }

    async create({
        email,
        password,
        name,
        surname
    }: {
        email: string,
        password: string,
        name: string,
        surname: string
    }): Promise<User> {
        const userInDb = await this.findOneByEmail(email);
        if (userInDb) {
            throw new HttpException('User already exists', 409);
        }

        const user: User = this.userRepository.create({
            email,
            password,
            name,
            surname
        });

        await this.userRepository.save(user);
        
        return user;
    }
}
