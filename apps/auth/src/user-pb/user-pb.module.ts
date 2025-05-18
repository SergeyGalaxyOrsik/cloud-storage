import { Module } from '@nestjs/common';
import { UserPbService } from './user-pb.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPub } from './user-pb.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserPub])
  ],
  providers: [UserPbService],
  exports: [UserPbService, TypeOrmModule]
})
export class UserPbModule {}
