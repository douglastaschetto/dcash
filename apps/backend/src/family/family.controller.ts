import { Controller, Post, Get, Patch, Body, Request, UseGuards } from '@nestjs/common';
import { FamilyService } from './family.service';
import { JoinFamilyDto } from './dto/join-family.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('family')
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createGroup(@Request() req: any) {
    return this.familyService.createGroup(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('join')
  async joinGroup(@Request() req: any, @Body() body: JoinFamilyDto) {
    return this.familyService.joinGroup(req.user.id, body.inviteCode);
  }

  @UseGuards(JwtAuthGuard)
  @Get('members')
  async getMembers(@Request() req: any) {
    return this.familyService.getMembers(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('rename')
  async renameGroup(@Request() req: any, @Body() body: { name: string }) {
    return this.familyService.renameGroup(req.user.id, body.name);
  }
}
