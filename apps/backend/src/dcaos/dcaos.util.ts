import { BadRequestException } from '@nestjs/common';
import {
  FamilyScope,
  FamilyScopeService,
} from '../common/scope/family-scope.service';
import { DcaosNotifyService } from './dcaos-notify.service';

/** Household reminders follow Brazilian local time regardless of server TZ. */
export const TZ = 'America/Sao_Paulo';

export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Current date/time parts in the household timezone. */
export function localNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const iso = `${get('year')}-${get('month')}-${get('day')}`;
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
    get('weekday'),
  );
  return { iso, hour: Number(get('hour')), dow };
}

export const parseISO = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00`);

export const addDays = (iso: string, days: number) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
};

export const daysBetween = (fromIso: string, toIso: string) =>
  Math.round(
    (parseISO(toIso).getTime() - parseISO(fromIso).getTime()) / 86400000,
  );

/** Scope filter bound at `$n`, with columns prefixed by a table alias. */
export async function aliasScope(
  familyScope: FamilyScopeService,
  userId: string,
  n: number,
  alias: string,
): Promise<FamilyScope> {
  const scope = await familyScope.getScope(userId);
  return {
    ...scope,
    filter: familyScope
      .filterAt(scope, n)
      .replace(/\b(user_id|family_group_id)\b/g, `${alias}.$1`),
  };
}

export async function assertMembers(
  familyScope: FamilyScopeService,
  notify: DcaosNotifyService,
  userId: string,
  ids: (string | null | undefined)[],
) {
  const wanted = ids.filter((x): x is string => !!x);
  if (!wanted.length) return;
  const scope = await familyScope.getScope(userId);
  const members = await notify.members(scope, userId);
  if (wanted.some((id) => !members.some((m) => m.id === id))) {
    throw new BadRequestException('Pessoa não faz parte da família.');
  }
}

/** Builds `col = $n` fragments for the provided (non-undefined) fields. */
export function buildSets(fields: Record<string, unknown>) {
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [col, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    params.push(value);
    sets.push(`${col} = $${params.length}`);
  }
  return { sets, params };
}
