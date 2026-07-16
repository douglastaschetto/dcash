import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly db: DatabaseService) {}

  private async getScope(userId: string) {
    const res = await this.db.query(
      'SELECT family_group_id FROM db_dtasc.users WHERE id = $1',
      [userId],
    );
    const familyGroupId = res[0]?.family_group_id;
    return {
      familyGroupId,
      param: familyGroupId || userId,
      isFamily: !!familyGroupId,
    };
  }

  async create(userId: string, dto: CreateCategoryDto) {
    if (!userId) throw new BadRequestException('ID do usuário é obrigatório.');
    const scope = await this.getScope(userId);

    const filter = scope.isFamily
      ? 'family_group_id = $2'
      : 'user_id = $2 AND family_group_id IS NULL';

    const existing = await this.db.query(
      `SELECT id FROM db_dtasc.category WHERE name ILIKE $1 AND ${filter}`,
      [dto.name, scope.param],
    );
    if (existing.length > 0)
      throw new ConflictException('Você já possui uma categoria com este nome.');

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
      console.error('Erro ao inserir categoria:', err);
      throw new InternalServerErrorException('Falha ao registrar categoria.');
    }
  }

  async findAll(userId: string) {
    const scope = await this.getScope(userId);
    const filter = scope.isFamily
      ? 'family_group_id = $1'
      : 'user_id = $1 AND family_group_id IS NULL';
    return this.db.query(
      `SELECT id, name, color, icon, type,
              user_id as "userId", family_group_id as "familyGroupId"
       FROM db_dtasc.category
       WHERE ${filter}
       ORDER BY name ASC`,
      [scope.param],
    );
  }

  async update(id: string, userId: string, dto: UpdateCategoryDto) {
    const scope = await this.getScope(userId);
    const filter = scope.isFamily
      ? 'family_group_id = $2'
      : 'user_id = $2 AND family_group_id IS NULL';

    const existing = await this.db.query(
      `SELECT id FROM db_dtasc.category WHERE id = $1 AND ${filter}`,
      [id, scope.param],
    );
    if (existing.length === 0)
      throw new NotFoundException('Categoria não encontrada ou permissão negada.');

    if (dto.name) {
      const dupFilter = scope.isFamily
        ? 'family_group_id = $3'
        : 'user_id = $3 AND family_group_id IS NULL';
      const dup = await this.db.query(
        `SELECT id FROM db_dtasc.category WHERE name ILIKE $1 AND id != $2 AND ${dupFilter}`,
        [dto.name, id, scope.param],
      );
      if (dup.length > 0)
        throw new ConflictException('Você já possui uma categoria com este nome.');
    }

    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;
    if (dto.name !== undefined)  { sets.push(`name = $${idx++}`);  params.push(dto.name); }
    if (dto.type !== undefined)  { sets.push(`type = $${idx++}`);  params.push(dto.type); }
    if (dto.color !== undefined) { sets.push(`color = $${idx++}`); params.push(dto.color); }
    if (dto.icon !== undefined)  { sets.push(`icon = $${idx++}`);  params.push(dto.icon); }

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
      console.error('Erro ao atualizar categoria:', err);
      throw new InternalServerErrorException('Falha ao atualizar categoria.');
    }
  }

  async remove(id: string, userId: string) {
    const scope = await this.getScope(userId);
    const filter = scope.isFamily
      ? 'family_group_id = $2'
      : 'user_id = $2 AND family_group_id IS NULL';
    try {
      const result = await this.db.query(
        `DELETE FROM db_dtasc.category WHERE id = $1 AND ${filter} RETURNING id`,
        [id, scope.param],
      );
      if (result.length === 0)
        throw new NotFoundException('Categoria não encontrada ou permissão negada.');
      return { message: 'Categoria excluída com sucesso', id: result[0].id };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      if ((err as any).code === '23503')
        throw new ConflictException('Esta categoria possui transações vinculadas e não pode ser excluída.');
      throw new InternalServerErrorException('Erro ao processar a exclusão.');
    }
  }
}
