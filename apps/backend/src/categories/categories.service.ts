import {
  Injectable,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PlanService } from '../plan/plan.service';
import { FamilyScopeService } from '../common/scope/family-scope.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly planService: PlanService,
    private readonly familyScope: FamilyScopeService,
  ) {}

  async create(userId: string, dto: CreateCategoryDto) {
    if (!userId) throw new BadRequestException('ID do usuário é obrigatório.');
    const scope = await this.familyScope.getScope(userId);

    const filter = this.familyScope.filterAt(scope, 2);

    const existing = await this.db.query(
      `SELECT id FROM db_dtasc.category WHERE name ILIKE $1 AND ${filter}`,
      [dto.name, scope.param],
    );
    if (existing.length > 0)
      throw new ConflictException(
        'Você já possui uma categoria com este nome.',
      );

    const limit = await this.planService.getNumericLimit(
      userId,
      'max_categories',
    );
    if (limit !== null) {
      const [{ count }] = await this.db.query(
        `SELECT COUNT(*)::int AS count FROM db_dtasc.category WHERE ${scope.filter}`,
        [scope.param],
      );
      if (count >= limit) {
        throw new ForbiddenException(
          `Limite de ${limit} categorias do seu plano atingido. Faça upgrade para criar mais.`,
        );
      }
    }

    try {
      const result = await this.db.query(
        `INSERT INTO db_dtasc.category (name, color, icon, type, user_id, family_group_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, color, icon, type,
                   user_id as "userId", family_group_id as "familyGroupId"`,
        [dto.name, dto.color, dto.icon, dto.type, userId, scope.familyGroupId],
      );
      return result[0];
    } catch (err) {
      this.logger.error(
        'Erro ao inserir categoria',
        err instanceof Error ? err.stack : String(err),
      );
      throw new InternalServerErrorException('Falha ao registrar categoria.');
    }
  }

  async findAll(userId: string) {
    const scope = await this.familyScope.getScope(userId);
    return this.db.query(
      `SELECT id, name, color, icon, type,
              user_id as "userId", family_group_id as "familyGroupId"
       FROM db_dtasc.category
       WHERE ${scope.filter}
       ORDER BY name ASC`,
      [scope.param],
    );
  }

  async update(id: string, userId: string, dto: UpdateCategoryDto) {
    const scope = await this.familyScope.getScope(userId);
    const filter = this.familyScope.filterAt(scope, 2);

    const existing = await this.db.query(
      `SELECT id FROM db_dtasc.category WHERE id = $1 AND ${filter}`,
      [id, scope.param],
    );
    if (existing.length === 0)
      throw new NotFoundException(
        'Categoria não encontrada ou permissão negada.',
      );

    if (dto.name) {
      const dupFilter = this.familyScope.filterAt(scope, 3);
      const dup = await this.db.query(
        `SELECT id FROM db_dtasc.category WHERE name ILIKE $1 AND id != $2 AND ${dupFilter}`,
        [dto.name, id, scope.param],
      );
      if (dup.length > 0)
        throw new ConflictException(
          'Você já possui uma categoria com este nome.',
        );
    }

    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;
    if (dto.name !== undefined) {
      sets.push(`name = $${idx++}`);
      params.push(dto.name);
    }
    if (dto.type !== undefined) {
      sets.push(`type = $${idx++}`);
      params.push(dto.type);
    }
    if (dto.color !== undefined) {
      sets.push(`color = $${idx++}`);
      params.push(dto.color);
    }
    if (dto.icon !== undefined) {
      sets.push(`icon = $${idx++}`);
      params.push(dto.icon);
    }

    if (sets.length === 0) {
      const [current] = await this.db.query(
        `SELECT id, name, color, icon, type,
                user_id as "userId", family_group_id as "familyGroupId"
         FROM db_dtasc.category WHERE id = $1`,
        [id],
      );
      return current;
    }

    params.push(id);
    try {
      const result = await this.db.query(
        `UPDATE db_dtasc.category SET ${sets.join(', ')}
         WHERE id = $${idx}
         RETURNING id, name, color, icon, type,
                   user_id as "userId", family_group_id as "familyGroupId"`,
        params,
      );
      return result[0];
    } catch (err) {
      this.logger.error(
        'Erro ao atualizar categoria',
        err instanceof Error ? err.stack : String(err),
      );
      throw new InternalServerErrorException('Falha ao atualizar categoria.');
    }
  }

  async remove(id: string, userId: string) {
    const scope = await this.familyScope.getScope(userId);
    const filter = this.familyScope.filterAt(scope, 2);
    try {
      const result = await this.db.query(
        `DELETE FROM db_dtasc.category WHERE id = $1 AND ${filter} RETURNING id`,
        [id, scope.param],
      );
      if (result.length === 0)
        throw new NotFoundException(
          'Categoria não encontrada ou permissão negada.',
        );
      return { message: 'Categoria excluída com sucesso', id: result[0].id };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      if (err.code === '23503')
        throw new ConflictException(
          'Esta categoria possui transações vinculadas e não pode ser excluída.',
        );
      throw new InternalServerErrorException('Erro ao processar a exclusão.');
    }
  }
}
