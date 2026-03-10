import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateTodoDto {
  @IsString()
  @IsNotEmpty({ message: 'O título da tarefa não pode estar vazio' })
  @MinLength(3, { message: 'O título deve ter pelo menos 3 caracteres' })
  title: string;
}