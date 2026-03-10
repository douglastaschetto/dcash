import { 
  Controller,
  Get,
  Post,
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Request, 
  UnauthorizedException, 
} from '@nestjs/common';
import { TodosService } from './todos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('todos')
@UseGuards(JwtAuthGuard)
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  /**
   * Helper para extração segura do ID do usuário
   */
  private getUserId(req: any): string {
    const id = req.user?.id || req.user?.userId || req.user?.sub;
    if (!id) throw new UnauthorizedException('Usuário não identificado.');
    return id;
  }

  @Post()
  async create(@Request() req, @Body() body: { title: string }) {
    const userId = this.getUserId(req);
    
    // O Service agora cuida de buscar o familyGroupId internamente
    // Isso evita que o app quebre se o JWT não tiver o campo no payload
    return this.todosService.create(userId, body.title);
  }

  @Get()
  async findAllPending(@Request() req) {
    const userId = this.getUserId(req);
    return this.todosService.findAllPending(userId);
  }

  @Patch(':id/complete')
  async complete(@Request() req, @Param('id') id: string) {
    const userId = this.getUserId(req);
    return this.todosService.complete(userId, id);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    const userId = this.getUserId(req);
    return this.todosService.delete(userId, id);
  }
}