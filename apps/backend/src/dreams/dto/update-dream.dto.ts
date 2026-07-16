import { PartialType } from '@nestjs/swagger';
import { CreateDreamDto } from './create-dream.dto';

export class UpdateDreamDto extends PartialType(CreateDreamDto) {}
