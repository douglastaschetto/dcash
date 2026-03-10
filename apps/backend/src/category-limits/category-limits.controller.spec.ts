import { Test, TestingModule } from '@nestjs/testing';
import { CategoryLimitsController } from './category-limits.controller';

describe('CategoryLimitsController', () => {
  let controller: CategoryLimitsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryLimitsController],
    }).compile();

    controller = module.get<CategoryLimitsController>(CategoryLimitsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
