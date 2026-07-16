import { IsString, IsNotEmpty, Length } from 'class-validator';

export class JoinFamilyDto {
  @IsString()
  @IsNotEmpty()
  @Length(5, 20)
  inviteCode: string;
}
