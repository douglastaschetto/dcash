import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { FamilyScopeService } from '../common/scope/family-scope.service';
import { DcaosNotifyService } from './dcaos-notify.service';
import { fill } from './dcaos.messages';
import { CreateNoteDto } from './dto/dcaos.dto';

const S = 'db_dtasc';

/** "Recados" — notes to the whole family or to a specific member. */
@Injectable()
export class DcaosNotesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly familyScope: FamilyScopeService,
    private readonly notify: DcaosNotifyService,
  ) {}

  private async scope(userId: string, n: number) {
    const scope = await this.familyScope.getScope(userId);
    return {
      ...scope,
      filter: this.familyScope
        .filterAt(scope, n)
        .replace(/(user_id|family_group_id)/g, 'n.$1'),
    };
  }

  /** Notes visible to the user: to everyone, to them, or written by them. */
  async list(userId: string) {
    const scope = await this.scope(userId, 2);
    return this.db.query(
      `SELECT n.id, n.message, n.color, n.pinned, n.reactions,
              n.author_id    AS "authorId",    au.name AS "authorName", au.avatar AS "authorAvatar",
              n.recipient_id AS "recipientId", ru.name AS "recipientName",
              ($1 = ANY(n.read_by)) AS "read",
              cardinality(array_remove(n.read_by, n.author_id)) AS "readCount",
              n.created_at   AS "createdAt"
       FROM ${S}.dcaos_notes n
       LEFT JOIN ${S}.users au ON au.id = n.author_id
       LEFT JOIN ${S}.users ru ON ru.id = n.recipient_id
       WHERE ${scope.filter}
         AND (n.recipient_id IS NULL OR n.recipient_id = $1 OR n.author_id = $1)
       ORDER BY n.pinned DESC, n.created_at DESC
       LIMIT 100`,
      [userId, scope.param],
    );
  }

  async unreadCount(userId: string): Promise<number> {
    const scope = await this.scope(userId, 2);
    const [row] = await this.db.query<{ n: string }>(
      `SELECT COUNT(*) AS n FROM ${S}.dcaos_notes n
       WHERE ${scope.filter} AND n.author_id <> $1
         AND (n.recipient_id IS NULL OR n.recipient_id = $1)
         AND NOT ($1 = ANY(n.read_by))`,
      [userId, scope.param],
    );
    return Number(row?.n ?? 0);
  }

  private async findVisible(userId: string, id: string) {
    const scope = await this.scope(userId, 3);
    const [note] = await this.db.query<{
      id: string;
      author_id: string;
      reactions: Record<string, string[]>;
    }>(
      `SELECT n.id, n.author_id, n.reactions FROM ${S}.dcaos_notes n
       WHERE n.id = $1 AND ${scope.filter}
         AND (n.recipient_id IS NULL OR n.recipient_id = $2 OR n.author_id = $2)`,
      [id, userId, scope.param],
    );
    if (!note) throw new NotFoundException('Recado não encontrado.');
    return note;
  }

  async create(userId: string, dto: CreateNoteDto) {
    const scope = await this.familyScope.getScope(userId);
    const members = await this.notify.members(scope, userId);
    if (dto.recipientId && !members.some((m) => m.id === dto.recipientId)) {
      throw new BadRequestException('Destinatário não faz parte da família.');
    }
    const message = dto.message.trim();
    const [row] = await this.db.query<{ id: string }>(
      `INSERT INTO ${S}.dcaos_notes (author_id, recipient_id, message, color, pinned, read_by, user_id, family_group_id)
       VALUES ($1, $2, $3, $4, $5, '{}'::text[], $1, $6)
       RETURNING id`,
      [
        userId,
        dto.recipientId || null,
        message,
        dto.color ?? 'yellow',
        dto.pinned ?? false,
        scope.familyGroupId,
      ],
    );
    const author = await this.notify.nameOf(userId);
    const preview =
      message.length > 70 ? `${message.slice(0, 67)}...` : message;
    const recipients = dto.recipientId
      ? [dto.recipientId]
      : members.map((m) => m.id);
    await this.notify.notify(
      recipients.filter((id) => id !== userId),
      scope.familyGroupId,
      {
        module: 'notes',
        body: fill('noteNew', { author, preview }),
        link: '/dcaos/recados',
      },
    );
    return { id: row.id };
  }

  async markRead(userId: string, id: string) {
    await this.findVisible(userId, id);
    await this.db.query(
      `UPDATE ${S}.dcaos_notes SET read_by = array_append(read_by, $1)
       WHERE id = $2 AND NOT ($1 = ANY(read_by))`,
      [userId, id],
    );
    return { success: true };
  }

  async markAllRead(userId: string) {
    const scope = await this.scope(userId, 2);
    await this.db.query(
      `UPDATE ${S}.dcaos_notes n SET read_by = array_append(n.read_by, $1)
       WHERE ${scope.filter} AND (n.recipient_id IS NULL OR n.recipient_id = $1)
         AND NOT ($1 = ANY(n.read_by))`,
      [userId, scope.param],
    );
    return { success: true };
  }

  /** Toggles the user's reaction with `emoji`. */
  async react(userId: string, id: string, emoji: string) {
    const note = await this.findVisible(userId, id);
    const reactions: Record<string, string[]> = { ...(note.reactions ?? {}) };
    const users = new Set(reactions[emoji] ?? []);
    if (users.has(userId)) users.delete(userId);
    else users.add(userId);
    if (users.size) reactions[emoji] = Array.from(users);
    else delete reactions[emoji];
    await this.db.query(
      `UPDATE ${S}.dcaos_notes SET reactions = $1::jsonb WHERE id = $2`,
      [JSON.stringify(reactions), id],
    );
    return { reactions };
  }

  async togglePin(userId: string, id: string) {
    await this.findVisible(userId, id);
    await this.db.query(
      `UPDATE ${S}.dcaos_notes SET pinned = NOT pinned WHERE id = $1`,
      [id],
    );
    return { success: true };
  }

  async remove(userId: string, id: string) {
    const note = await this.findVisible(userId, id);
    if (note.author_id !== userId)
      throw new ForbiddenException('Só quem escreveu pode apagar o recado.');
    await this.db.query(`DELETE FROM ${S}.dcaos_notes WHERE id = $1`, [id]);
    return { success: true };
  }
}
