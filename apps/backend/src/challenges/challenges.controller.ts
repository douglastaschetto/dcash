import {
  Controller, Get, Post, Delete,
  Body, Param, Query, Request, UseGuards, UnauthorizedException,
} from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpsertChallengeDto } from './dto/upsert-challenge.dto';

@Controller('challenges')
@UseGuards(JwtAuthGuard)
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  private uid(req: any): string {
    const id = req.user?.id;
    if (!id) throw new UnauthorizedException();
    return id;
  }

  @Get()
  findAll(@Request() req: any, @Query('year') year?: string) {
    const yearNumber = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.challengesService.findAll(this.uid(req), yearNumber);
  }

  @Post()
  upsert(@Request() req: any, @Body() dto: UpsertChallengeDto) {
    return this.challengesService.upsert(this.uid(req), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.challengesService.delete(id, this.uid(req));
  }
}
