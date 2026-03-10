import { PartialType } from '@nestjs/mapped-types';
import { CreateDreamDto } from './create-dream.dto';

export class UpdateDreamDto extends PartialType(CreateDreamDto) {}