export interface TourTargetCatalogEntry {
  key: string;
  route: string;
  label: string;
}

/**
 * Catálogo dos atributos data-tour já instrumentados no frontend.
 * Ao adicionar um novo data-tour="..." em qualquer página, adicione também uma entrada aqui
 * para que ele fique disponível no editor de guias do admin.
 */
export const TOUR_TARGET_CATALOG: TourTargetCatalogEntry[] = [
  { key: 'dashboard-greeting', route: '/dashboard-v2', label: 'Saudação do Painel Início' },
  { key: 'dashboard-balance-card', route: '/dashboard-v2', label: 'Card "Saldo do mês"' },
  { key: 'dashboard-quick-actions', route: '/dashboard-v2', label: 'Linha de ações rápidas' },
  { key: 'dashboard-dre-toggle', route: '/dashboard-v2', label: 'Alternador de visão DRE' },
  { key: 'dashboard-installments-card', route: '/dashboard-v2', label: 'Card "Raio-X de parcelamentos"' },
  { key: 'dashboard-planning-card', route: '/dashboard-v2', label: 'Card "Planejamento do mês"' },
  { key: 'transactions-lancar-btn', route: '/transactions', label: 'Botão "Lançar"' },

  // Painel gerencial
  { key: 'painel-greeting', route: '/painel', label: 'Saudação "Olá, Nome"' },
  { key: 'painel-quick-actions', route: '/painel', label: 'Ações rápidas e atalhos' },
  { key: 'painel-kpis', route: '/painel', label: 'Cards Saldo/Receitas/Despesas' },
  { key: 'painel-week', route: '/painel', label: 'Cards de hoje + próximos 6 dias' },
  { key: 'painel-day', route: '/painel', label: 'Detalhe do dia selecionado' },
  { key: 'painel-categories', route: '/painel', label: 'Card "Despesas por categoria"' },
  { key: 'painel-dre-toggle', route: '/painel', label: 'Alternador Gráfico/DRE' },
  { key: 'painel-challenge', route: '/painel', label: 'Card "Desafio do mês"' },
  { key: 'painel-installments', route: '/painel', label: 'Card "Raio-X parcelamentos"' },
  { key: 'painel-notes', route: '/painel', label: 'Bilhetinhos (DCaos)' },
  { key: 'painel-planning', route: '/painel', label: 'Card "Planejamento do mês"' },
  { key: 'painel-status', route: '/painel', label: 'Resumo Compras/Cofrinhos/Sonhos/Desejos' },
  { key: 'painel-radar', route: '/painel', label: 'Radar da família (insights)' },

  // DCaos
  { key: 'dcaos-hub-greeting', route: '/dcaos', label: 'Casa: saudação e atalhos' },
  { key: 'dcaos-hub-insights', route: '/dcaos', label: 'Casa: insights do dia' },
  { key: 'dcaos-hub-today', route: '/dcaos', label: 'Casa: hoje, mercado e bilhetinhos' },
  { key: 'dcaos-hub-modules', route: '/dcaos', label: 'Casa: módulos' },
  { key: 'dcaos-tasks-page', route: '/dcaos/tarefas', label: 'Quem Vai Fazer? (tarefas)' },
  { key: 'dcaos-market-tabs', route: '/dcaos/mercado', label: 'Abas Lista de compras/Despensa' },
  { key: 'dcaos-market-add', route: '/dcaos/mercado', label: 'Campo de adicionar item' },
  { key: 'dcaos-market-pantry-tab', route: '/dcaos/mercado', label: 'Aba "Despensa"' },
  { key: 'dcaos-market-showcase', route: '/dcaos/mercado', label: 'Botão "Vitrine de produtos"' },
  { key: 'dcaos-notes-composer', route: '/dcaos/recados', label: 'Escrever recado' },
  { key: 'dcaos-notes-tabs', route: '/dcaos/recados', label: 'Abas Mural/Meus bilhetes/Enviados' },
  { key: 'dcaos-habits-page', route: '/dcaos/habitos', label: 'Faz Todo Dia (hábitos)' },
  { key: 'dcaos-dates-page', route: '/dcaos/datas', label: 'Não Esquece (datas)' },
  { key: 'dcaos-maintenance-page', route: '/dcaos/manutencao', label: 'Deu Ruim (manutenção)' },

  // Contas
  { key: 'accounts-add-btn', route: '/accounts', label: 'Botão "Nova conta"' },
  { key: 'accounts-balance-card', route: '/accounts', label: 'Card "Saldo Total"' },
  { key: 'accounts-limit-card', route: '/accounts', label: 'Card "Limite Total"' },
  { key: 'accounts-filter-chips', route: '/accounts', label: 'Filtro por tipo de conta' },

  // Contas Fixas
  { key: 'fixed-bills-add-btn', route: '/fixed-bills', label: 'Botão "Nova Conta Fixa"' },
  { key: 'fixed-bills-month-nav', route: '/fixed-bills', label: 'Navegador de mês' },
  { key: 'fixed-bills-kpi-cards', route: '/fixed-bills', label: 'Cards Total/Pendente/Pago' },
  { key: 'fixed-bills-table', route: '/fixed-bills', label: 'Tabela de contas fixas' },

  // Parcelamentos
  { key: 'installments-month-nav', route: '/installments', label: 'Seletor de período' },
  { key: 'installments-insights', route: '/installments', label: 'Seção "Raio-X" de parcelamentos' },
  { key: 'installments-groups-list', route: '/installments', label: 'Lista de grupos de parcelas' },

  // Categorias
  { key: 'categories-add-btn', route: '/categories', label: 'Botão "Nova categoria"' },
  { key: 'categories-type-filters', route: '/categories', label: 'Filtros por tipo (Receita/Despesa/Reserva)' },
  { key: 'categories-list', route: '/categories', label: 'Lista de categorias agrupadas' },

  // Cofrinhos
  { key: 'piggy-banks-add-btn', route: '/piggy-banks', label: 'Botão "Nova Meta"' },
  { key: 'piggy-banks-kpi-cards', route: '/piggy-banks', label: 'Cards de KPI dos cofrinhos' },
  { key: 'piggy-banks-grid', route: '/piggy-banks', label: 'Grid de cofrinhos' },

  // Sonhos
  { key: 'dreams-add-btn', route: '/dreams', label: 'Botão "Projetar Sonho"' },
  { key: 'dreams-kpi-cards', route: '/dreams', label: 'Cards de KPI dos sonhos' },
  { key: 'dreams-grid', route: '/dreams', label: 'Grid de sonhos' },

  // Desejos
  { key: 'wishlists-add-btn', route: '/wishlists', label: 'Botão "Novo Desejo"' },
  { key: 'wishlists-summary', route: '/wishlists', label: 'Resumo pendentes/adquiridos' },
  { key: 'wishlists-pending-section', route: '/wishlists', label: 'Seção "Pendentes"' },

  // Desafios
  { key: 'challenges-stats-card', route: '/challenges', label: 'Card de desempenho anual' },
  { key: 'challenges-new-btn', route: '/challenges', label: 'Botão "Novo desafio"' },
  { key: 'challenges-months-grid', route: '/challenges', label: 'Grid de 12 meses' },

  // Planejamento
  { key: 'planning-year-nav', route: '/planning', label: 'Seletor de ano' },
  { key: 'planning-months-grid', route: '/planning', label: 'Grid de meses' },
  { key: 'planning-start-btn', route: '/planning', label: 'Botão "Iniciar planejamento"' },

  // Agenda
  { key: 'calendar-add-btn', route: '/calendar', label: 'Botão "Novo Evento"' },
  { key: 'calendar-summary-cards', route: '/calendar', label: 'Cards de resumo do mês' },
  { key: 'calendar-month-nav', route: '/calendar', label: 'Navegação de mês' },
  { key: 'calendar-grid', route: '/calendar', label: 'Grid do calendário' },

  // Tarefas
  { key: 'todos-add-card', route: '/todos', label: 'Card "Nova tarefa"' },
  { key: 'todos-pending-card', route: '/todos', label: 'Card "Pendentes"' },
  { key: 'todos-completed-toggle', route: '/todos', label: 'Toggle "Concluídas"' },

  // Perfil
  { key: 'profile-personal-data', route: '/profile', label: 'Card "Dados Pessoais"' },
  { key: 'profile-notifications', route: '/profile', label: 'Card "Notificações & Integrações"' },
  { key: 'profile-subscription', route: '/profile', label: 'Card "Assinatura"' },
  { key: 'profile-family-group', route: '/profile', label: 'Card "Grupo Familiar"' },
];

export function findTourTarget(key: string): TourTargetCatalogEntry | undefined {
  return TOUR_TARGET_CATALOG.find((t) => t.key === key);
}
