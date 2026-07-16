import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Request, UseGuards, UnauthorizedException,
} from '@nestjs/common';
import { TodosService } from './todos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTodoDto } from './dto/create-todo.dto';

@Controller('todos')
@UseGuards(JwtAuthGuard)
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  private uid(req: any): string {
    const id = req.user?.id;
    if (!id) throw new UnauthorizedException();
    return id;
  }

  @Post()
  create(@Request() req: any, @Body() body: CreateTodoDto) {
    return this.todosService.create(this.uid(req), body.title);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.todosService.findAll(this.uid(req));
  }

  @Get('pending')
  findPending(@Request() req: any) {
    return this.todosService.findAllPending(this.uid(req));
  }

  @Patch(':id/complete')
  complete(@Request() req: any, @Param('id') id: string) {
    return this.todosService.complete(this.uid(req), id);
  }

  @Patch(':id/uncomplete')
  uncomplete(@Request() req: any, @Param('id') id: string) {
    return this.todosService.uncomplete(this.uid(req), id);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.todosService.delete(this.uid(req), id);
  }
}
