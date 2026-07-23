import { Body, Controller, Get, Post, Request, UnauthorizedException, UseGuards } from '@nestjs/common';
import { SupportAiService } from './support-ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SendSupportMessageDto } from './dto/send-message.dto';

@Controller('support-ai')
@UseGuards(JwtAuthGuard)
export class SupportAiController {
  constructor(private readonly supportAiService: SupportAiService) {}

  private uid(req: any): string {
    const id = req.user?.id;
    if (!id) throw new UnauthorizedException();
    return id;
  }

  @Get('history')
  getHistory(@Request() req: any) {
    return this.supportAiService.getHistory(this.uid(req));
  }

  @Post('messages')
  sendMessage(@Request() req: any, @Body() body: SendSupportMessageDto) {
    return this.supportAiService.sendMessage(this.uid(req), body.message);
  }
}
