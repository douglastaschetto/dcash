import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Request, UseGuards, UnauthorizedException,
} from '@nestjs/common';
import { CalendarEventsService } from './calendar-events.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('calendar-events')
@UseGuards(JwtAuthGuard)
export class CalendarEventsController {
  constructor(private readonly calendarEventsService: CalendarEventsService) {}

  private getUserId(req: any): string {
    const id = req.user?.id;
    if (!id) throw new UnauthorizedException('Sessão inválida.');
    return id;
  }

  @Get('monthly')
  findMonthly(
    @Request() req,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const m = month ? Number(month) : new Date().getMonth() + 1;
    const y = year ? Number(year) : new Date().getFullYear();
    return this.calendarEventsService.findMonthly(this.getUserId(req), m, y);
  }

  @Post()
  create(@Request() req, @Body() dto: CreateCalendarEventDto) {
    return this.calendarEventsService.create(this.getUserId(req), dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: Partial<CreateCalendarEventDto>,
  ) {
    return this.calendarEventsService.update(id, this.getUserId(req), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.calendarEventsService.remove(id, this.getUserId(req));
  }
}
