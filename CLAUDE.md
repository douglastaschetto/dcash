# DCash v2

## Design / UI (obrigatório)

> **Tema APROVADO e TRAVADO (06/10/2026).** O visual atual foi aprovado pelo usuário.
> **Não altere** tokens do `globals.css`, o layout ou estilo da sidebar/top bar, o estilo dos gráficos
> nem a identidade visual das telas **sem pedir permissão antes**. Telas novas devem reaproveitar os
> tokens e padrões que já existem. Se uma tarefa parecer exigir mudança visual, pergunte primeiro.

Qualquer alteração visual no frontend (`apps/frontend`) **deve** seguir
[apps/frontend/DESIGN_SYSTEM.md](apps/frontend/DESIGN_SYSTEM.md). Leia antes de criar ou alterar telas.

Resumo:
- Acento de marca = **esmeralda** (`#10B981` escuro / `#059669` claro). **Nunca laranja.**
- Use apenas tokens semânticos (`bg-card`, `bg-surface-2`, `border-border`, `text-fg`, `text-fg-muted`, `text-accent`, `bg-primary`, `bg-primary-soft`, `text-danger`, `text-warning`, `text-info`…), definidos em `apps/frontend/src/app/globals.css`. Nada de hex ou paletas do Tailwind (`orange-*`, `purple-*`, `zinc-*`) direto nos componentes.
- Dois temas via `[data-theme="dark"|"light"]`, mesma hierarquia nos dois.
- Conteúdo das páginas **sempre em largura total** (`w-full p-4 md:p-6`). Nunca `mx-auto max-w-*`.
- Visual compacto: tipografia contida, bordas sutis em vez de sombras, raios de 6/8/12/16px.
- Redesign mexe só na camada visual: não altere regras de negócio, API, rotas nem auth.

## Dev

- Depois de mudar `globals.css` ou alguma página, se a tela não mudar, o cache do Next está velho: pare o servidor, apague `apps/frontend/.next` e rode `npm run dev` de novo.
