/**
 * DCaos speaks in a deliberately provocative tone. Each event has a few
 * variants so repeated reminders don't read like a broken record.
 * `{placeholders}` are filled by `fill()`.
 */

export const MODULE_NAMES = {
  tasks: 'Quem Vai Fazer?',
  market: 'Abastece Aí',
  notes: 'Recados',
  agenda: 'Quem Tem Compromisso?',
  habits: 'Faz Todo Dia',
  dates: 'Não Esquece',
  maintenance: 'Deu Ruim',
  system: 'O Sistema Lembrou',
  family: 'Os Envolvidos',
  insights: 'Insights do dia',
  finance: 'Saúde das finanças',
} as const;

/** Emoji shown in the device notification title. */
export const MODULE_EMOJI: Record<keyof typeof MODULE_NAMES, string> = {
  tasks: '📝',
  market: '🛒',
  notes: '🗒️',
  agenda: '📅',
  habits: '🔁',
  dates: '🎂',
  maintenance: '🔧',
  system: '🔔',
  family: '👨‍👩‍👧',
  insights: '✨',
  finance: '💰',
};

export type DcaosModuleKey = keyof typeof MODULE_NAMES;

const MESSAGES = {
  taskAssigned: [
    '"{title}" agora é sua. {author} confia em você. Mais ou menos.',
    'A tarefa "{title}" não vai se fazer sozinha. {author} escolheu você.',
    '{author} lembrou que você existe: "{title}" está te esperando.',
  ],
  taskDueToday: [
    'Hoje é dia de "{title}". Não adianta fingir que não viu.',
    '"{title}" vence hoje. A casa agradece (ou não).',
  ],
  taskOverdue: [
    '"{title}" está atrasada há {days} dia(s). Ninguém vai fazer por você. Ninguém mesmo.',
    'A louça não vai se lavar sozinha. "{title}" está esperando há {days} dia(s).',
    '"{title}" segue pendente há {days} dia(s). Já pode ser considerada patrimônio da família.',
  ],
  taskDone: [
    'Milagre: {who} concluiu "{title}".',
    '{who} fez "{title}". Anotem a data.',
    '"{title}" foi feita por {who}. Sim, de verdade.',
  ],
  marketRanOut: [
    'O {item} acabou.',
    'Alerta de crise doméstica: acabou o {item}.',
  ],
  marketRanOutAgain: [
    'O {item} acabou. Novamente.',
    'O {item} acabou pela {times}ª vez. Alguém está tomando escondido.',
  ],
  marketLowStock: ['O {item} está no fim. Ainda dá tempo de evitar o drama.'],
  marketCheckout: [
    '{who} abasteceu a casa: {count} item(ns) comprado(s). Pode respirar.',
    'Despensa reabastecida por {who} ({count} item(ns)). Herói(na) do dia.',
  ],
  noteNew: [
    '{author} deixou um recado: "{preview}"',
    'Recado de {author}: "{preview}". Ignorar não é uma opção.',
  ],
  // ── Quem Tem Compromisso? ──
  eventInvite: [
    '{author} marcou "{title}" para {when} com você. Não adianta fingir surpresa.',
    'Você foi escalado(a) para "{title}" ({when}). Cortesia de {author}.',
  ],
  eventToday: [
    'Hoje tem "{title}"{time}. Ninguém pode dizer que não sabia.',
    'Lembrete: "{title}" é hoje{time}. Roupa passada? Imaginamos que não.',
  ],
  eventSoon: [
    'Faltam {days} dia(s) para "{title}". O sistema avisou. Duas vezes, se precisar.',
  ],
  // ── Faz Todo Dia ──
  habitReminder: [
    'Você criou o hábito de "{title}". Ele não vai se cumprir sozinho.',
    '"{title}" ainda não foi feito hoje. O sistema está levemente decepcionado.',
    'Você criou o hábito de "{title}". Quem depende disso também lembra.',
  ],
  habitStreak: [
    '{days} dias seguidos de "{title}". Quem diria.',
    'Sequência de {days} dias em "{title}". Está virando gente organizada.',
  ],
  // ── Não Esquece ──
  dateToday: [
    'Hoje é {title}. Boa sorte.',
    'Hoje é {title}. Se esqueceu, ainda dá tempo de fingir que não.',
  ],
  dateSoon: [
    'Faltam {days} dia(s) para {title}. Presente comprado? Imaginamos que não.',
    '{title} em {days} dia(s). Esquecer não é uma opção (sério).',
  ],
  // ── Deu Ruim ──
  maintenanceNew: [
    '{author} avisou: deu ruim em "{title}". Alguém aí se habilita?',
    'Deu ruim: "{title}". {author} reportou, agora falta alguém resolver.',
  ],
  maintenanceStale: [
    '"{title}" está pendente há {days} dias. Agora já pode ser considerado decoração.',
    '"{title}" completa {days} dias sem conserto. Já faz parte da família.',
  ],
  maintenanceDone: [
    '"{title}" foi resolvido por {who}. Pode voltar a usar sem medo.',
    'Milagre da engenharia doméstica: {who} resolveu "{title}".',
  ],
  maintenancePreventive: [
    'Manutenção preventiva: "{title}" vence {when}. Prevenir é mais barato que o "Deu Ruim".',
  ],
} as const;

export type MessageKey = keyof typeof MESSAGES;

export function fill(
  key: MessageKey,
  vars: Record<string, string | number>,
): string {
  const variants = MESSAGES[key];
  const template = variants[Math.floor(Math.random() * variants.length)];
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}
