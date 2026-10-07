import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const RECURRENCES = [
  'none',
  'daily',
  'weekly',
  'biweekly',
  'monthly',
] as const;
export const NOTE_COLORS = [
  'yellow',
  'green',
  'blue',
  'pink',
  'purple',
] as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class SubscribeAddonDto {
  @IsOptional()
  @IsIn(['monthly', 'yearly'])
  billingCycle?: 'monthly' | 'yearly';
}

// ── Quem Vai Fazer? ─────────────────────────────────────────────────────

export class CreateTaskDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string | null;

  @IsOptional()
  @Matches(ISO_DATE)
  dueDate?: string | null;

  @IsOptional()
  @IsIn(RECURRENCES)
  recurrence?: (typeof RECURRENCES)[number];

  /** Weekdays for `weekly` (0 = Sunday … 6 = Saturday); empty = every 7 days. */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  recurrenceDays?: number[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  points?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  area?: string | null;
}

export class UpdateTaskDto extends CreateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  declare title: string;
}

// ── Abastece Aí ─────────────────────────────────────────────────────────

export class CreatePantryItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  category?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  unit?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minQuantity?: number | null;

  @IsOptional()
  @IsBoolean()
  onList?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  listQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  shelfLifeDays?: number | null;
}

export class UpdatePantryItemDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  category?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  unit?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minQuantity?: number | null;

  @IsOptional()
  @IsBoolean()
  onList?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  listQuantity?: number;

  @IsOptional()
  @IsBoolean()
  checked?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  shelfLifeDays?: number | null;
}

export class ConsumeDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(100000)
  amount?: number;
}

export class CheckoutDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ids?: string[];
}

// ── Recados ─────────────────────────────────────────────────────────────

export class CreateNoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  message: string;

  @IsOptional()
  @IsString()
  recipientId?: string | null;

  @IsOptional()
  @IsIn(NOTE_COLORS)
  color?: (typeof NOTE_COLORS)[number];

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;
}

export class ReactDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8)
  emoji: string;
}

// ── Quem Tem Compromisso? ───────────────────────────────────────────────

export class CreateEventDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  /** ISO timestamp (or yyyy-mm-dd for all-day events). */
  @IsString()
  startDate: string;

  @IsOptional()
  @IsString()
  endDate?: string | null;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsOptional()
  @IsIn(['EVENT', 'APPOINTMENT', 'MEETING', 'REMINDER'])
  eventType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participantIds?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  notifyDaysBefore?: number;
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  color?: string;

  @IsOptional()
  @IsBoolean()
  notifyWhatsapp?: boolean;
}

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string | null;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsOptional()
  @IsIn(['EVENT', 'APPOINTMENT', 'MEETING', 'REMINDER'])
  eventType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participantIds?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  notifyDaysBefore?: number;
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  color?: string;

  @IsOptional()
  @IsBoolean()
  notifyWhatsapp?: boolean;
}

// ── Faz Todo Dia ────────────────────────────────────────────────────────

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateHabitDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  icon?: string | null;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];

  @IsOptional()
  @Matches(HH_MM)
  reminderTime?: string | null;

  @IsOptional()
  @IsString()
  assigneeId?: string | null;
}

export class UpdateHabitDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  icon?: string | null;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];

  @IsOptional()
  @Matches(HH_MM)
  reminderTime?: string | null;

  @IsOptional()
  @IsString()
  assigneeId?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CheckHabitDto {
  @IsOptional()
  @Matches(ISO_DATE)
  date?: string;
}

// ── Não Esquece ─────────────────────────────────────────────────────────

export const DATE_KINDS = [
  'birthday',
  'anniversary',
  'commemorative',
  'document',
  'other',
] as const;

export class CreateImportantDateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  personName?: string | null;

  @IsOptional()
  @IsIn(DATE_KINDS)
  kind?: (typeof DATE_KINDS)[number];

  @Matches(ISO_DATE)
  eventDate: string;

  @IsOptional()
  @IsBoolean()
  yearKnown?: boolean;

  @IsOptional()
  @IsBoolean()
  yearly?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  remindDaysBefore?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class UpdateImportantDateDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  personName?: string | null;

  @IsOptional()
  @IsIn(DATE_KINDS)
  kind?: (typeof DATE_KINDS)[number];

  @IsOptional()
  @Matches(ISO_DATE)
  eventDate?: string;

  @IsOptional()
  @IsBoolean()
  yearKnown?: boolean;

  @IsOptional()
  @IsBoolean()
  yearly?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  remindDaysBefore?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

// ── Deu Ruim ────────────────────────────────────────────────────────────

export const MAINT_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const MAINT_STATUSES = [
  'open',
  'in_progress',
  'waiting',
  'done',
] as const;

export class CreateMaintenanceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @IsIn(['issue', 'preventive'])
  kind?: 'issue' | 'preventive';

  @IsOptional()
  @IsString()
  @MaxLength(40)
  area?: string | null;

  @IsOptional()
  @IsIn(MAINT_PRIORITIES)
  priority?: (typeof MAINT_PRIORITIES)[number];

  @IsOptional()
  @IsString()
  assigneeId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  professional?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  intervalMonths?: number | null;

  @IsOptional()
  @Matches(ISO_DATE)
  nextDue?: string | null;
}

export class UpdateMaintenanceDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  area?: string | null;

  @IsOptional()
  @IsIn(MAINT_PRIORITIES)
  priority?: (typeof MAINT_PRIORITIES)[number];

  @IsOptional()
  @IsIn(MAINT_STATUSES)
  status?: (typeof MAINT_STATUSES)[number];

  @IsOptional()
  @IsString()
  assigneeId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  professional?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  intervalMonths?: number | null;

  @IsOptional()
  @Matches(ISO_DATE)
  nextDue?: string | null;
}

// ── O Sistema Lembrou (push) ────────────────────────────────────────────

export const NOTIFY_MODULES = [
  'tasks',
  'market',
  'notes',
  'agenda',
  'habits',
  'dates',
  'maintenance',
  'system',
  'insights',
  'finance',
] as const;

export class BriefingTestDto {
  @IsIn(['insights', 'finance', 'tasks', 'habits', 'market', 'notes', 'agenda'])
  kind:
    | 'insights'
    | 'finance'
    | 'tasks'
    | 'habits'
    | 'market'
    | 'notes'
    | 'agenda';
}

export class PushSubscribeDto {
  @IsString()
  @MaxLength(1000)
  endpoint: string;

  @IsString()
  @MaxLength(300)
  p256dh: string;

  @IsString()
  @MaxLength(100)
  auth: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  userAgent?: string;
}

export class PushUnsubscribeDto {
  @IsString()
  @MaxLength(1000)
  endpoint: string;
}

export class PreferencesDto {
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsIn(NOTIFY_MODULES, { each: true })
  mutedModules?: string[];

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$|^$/)
  quietStart?: string | null;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$|^$/)
  quietEnd?: string | null;
}
