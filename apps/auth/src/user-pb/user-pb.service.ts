import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserPub } from './user-pb.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserPbService {
    constructor(
        @InjectRepository(UserPub)
        private readonly userPubRepository: Repository<UserPub>
    ) {}

    async findOneByDeviceId(deviceId: string): Promise<UserPub | null> {
        return this.userPubRepository.findOne({where: {deviceId}})
    }

    async create({
        userId,
        publicKey,
        deviceId
    }: {
        userId: string,
        publicKey: string,
        deviceId: string
    }): Promise<UserPub> {
        const userPubInDb = await this.findOneByDeviceId(deviceId);
        if (userPubInDb) {
            throw new HttpException('UserPub already exists', 409);
        }

        const userPub: UserPub = this.userPubRepository.create({
            userId,
            publicKey,
            deviceId
        });

        await this.userPubRepository.save(userPub);

        return userPub;
    }
}
