import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { GuidedToursService } from './guided-tours.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('guided-tours')
@UseGuards(JwtAuthGuard)
export class GuidedToursController {
  constructor(private readonly guidedToursService: GuidedToursService) {}

  @Get()
  listActive() {
    return this.guidedToursService.listActive();
  }

  @Get(':key')
  async getByKey(@Param('key') key: string) {
    const tour = await this.guidedToursService.getByKey(key);
    if (!tour) throw new NotFoundException('Tour não encontrado.');
    return tour;
  }
}
