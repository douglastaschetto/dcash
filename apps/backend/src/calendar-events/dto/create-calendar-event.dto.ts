import { IsString, IsDateString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class CreateCalendarEventDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  eventType?: string; // EVENT | APPOINTMENT | MEETING | REMINDER

  @IsString()
  @IsOptional()
  color?: string;

  @IsBoolean()
  @IsOptional()
  allDay?: boolean;

  @IsBoolean()
  @IsOptional()
  notifyWhatsapp?: boolean;

  @IsNumber()
  @IsOptional()
  notifyDaysBefore?: number;
}
