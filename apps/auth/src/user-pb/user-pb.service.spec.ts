import { Test, TestingModule } from '@nestjs/testing';
import { UserPbService } from './user-pb.service';

describe('UserPbService', () => {
  let service: UserPbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserPbService],
    }).compile();

    service = module.get<UserPbService>(UserPbService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
