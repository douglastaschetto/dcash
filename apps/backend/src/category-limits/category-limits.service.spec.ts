import { Test, TestingModule } from '@nestjs/testing';
import { CategoryLimitsService } from './category-limits.service';

describe('CategoryLimitsService', () => {
  let service: CategoryLimitsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoryLimitsService],
    }).compile();

    service = module.get<CategoryLimitsService>(CategoryLimitsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
