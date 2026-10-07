# DCash — Design System

> **Status: tema APROVADO e TRAVADO em 06/10/2026.** Nenhuma alteração visual (tokens, layout,
> sidebar, gráficos, componentes) pode ser feita sem permissão explícita do usuário.

**Toda mudança visual no frontend precisa seguir este documento.**
Ele é a fonte da verdade do tema. Os tokens estão implementados em
[src/app/globals.css](src/app/globals.css).

Direção: dashboard fintech/SaaS premium, moderno, limpo, minimalista,
orientado a dados, muito legível, responsivo e consistente em todas as páginas.
Profundidade vem de contraste de superfícies + bordas sutis + espaçamento,
**não** de sombras fortes ou glow.

---

## 1. Cor de marca: ESMERALDA (nunca laranja)

| Token | Hex |
|---|---|
| Emerald | `#10B981` |
| Emerald light | `#34D399` |
| Emerald dark | `#059669` |
| Emerald deep | `#047857` |

A esmeralda é usada em: botões primários, item ativo da navegação, abas
selecionadas, indicadores financeiros positivos, links, estados de foco,
série principal dos gráficos, barras de progresso e elementos interativos
importantes.

**Laranja NÃO é cor de marca nem de ação.** Não use `orange-*` como acento.

Cores semânticas, só quando elas comunicam algo:
- Positivo / sucesso → esmeralda (`success`)
- Negativo / erro / vencido → vermelho (`danger`)
- Atenção / em breve → âmbar (`warning`)
- Informação / categoria secundária → azul (`info`)
- Neutro → cinza (`fg-muted`)

---

## 2. Tema escuro (`[data-theme="dark"]`)

Nunca use preto puro. Use camadas neutras com leve tom verde.

| Papel | Hex |
|---|---|
| Background | `#0F1110` |
| Sidebar | `#121513` |
| Superfície principal | `#151917` |
| Card | `#191D1B` |
| Card hover | `#1D231F` |
| Borda | `#29302D` |
| Borda hover | `#37413C` |
| Texto primário | `#F5F7F6` |
| Texto secundário | `#A7B0AB` |
| Texto apagado (muted) | `#6F7973` |
| Texto desabilitado | `#4F5853` |
| Primária | `#10B981` (texto esmeralda: `#34D399`) |

## 3. Tema claro (`[data-theme="light"]`)

É um tema claro de verdade, não uma inversão do escuro. Mantém a mesma
hierarquia e espaçamento.

| Papel | Hex |
|---|---|
| Background | `#F7F9F8` |
| Sidebar | `#FFFFFF` |
| Superfície principal | `#F7F9F8` |
| Card | `#FFFFFF` |
| Superfície secundária | `#F3F6F4` |
| Hover | `#EEF3F0` |
| Borda | `#E1E7E4` |
| Borda hover | `#CBD5D0` |
| Texto primário | `#17201C` |
| Texto secundário | `#59645E` |
| Texto apagado (muted) | `#89928D` |
| Primária | `#059669` (light `#10B981`) |
| Fundo esmeralda | `#ECFDF5` |

---

## 4. Arquitetura de tokens: nunca escreva cor fixa nos componentes

Componentes consomem **somente** tokens semânticos, nunca hex nem paletas
do Tailwind (`orange-500`, `purple-500`, `zinc-800`…). Se faltar um token,
crie-o no `globals.css` para os dois temas.

| Variável CSS | Utilitário Tailwind | Uso |
|---|---|---|
| `--background` | `bg-background` | fundo da página |
| `--sidebar` | `bg-sidebar` | sidebar |
| `--surface` | `bg-surface` | superfície principal |
| `--surface-secondary` | `bg-surface-2` | superfície secundária, cabeçalhos de tabela, trilhos |
| `--card` | `bg-card` | cards |
| `--card-hover` / `--hover` | `bg-card-hover` / `bg-hover` | estados de hover |
| `--border` / `--border-hover` | `border-border` / `border-border-hover` | bordas |
| `--text-primary` | `text-fg` | texto principal |
| `--text-secondary` | `text-fg-2` | texto secundário |
| `--text-muted` | `text-fg-muted` | rótulos, texto auxiliar |
| `--text-disabled` | `text-fg-disabled` | desabilitado |
| `--primary` / `--primary-hover` | `bg-primary` / `bg-primary-hover` | ações primárias |
| `--primary-text` | `text-accent` | texto/ícone esmeralda |
| `--primary-soft` | `bg-primary-soft` | item ativo, badges positivos |
| `--success`, `--warning`, `--danger`, `--info` (+ `-soft`) | `text-danger`, `bg-warning-soft`… | status |
| `--track` | `bg-track` | trilho de barras de progresso |
| `--series-1..5`, `--chart-grid`, `--chart-axis` | `var(...)` | gráficos |

Classes de componente prontas: `.card`, `.btn`, `.btn-primary`,
`.btn-secondary`, `.btn-square`, `.icon-btn`, `.field`, `.eyebrow`,
`.tabular-nums`.

---

## 5. Tipografia

Fonte: Inter (ou Geist). Compacta e moderna. **Nada de tipografia gigante.**

| Elemento | Tamanho | Peso |
|---|---|---|
| Título de página | 20–24px | 600 |
| Título de seção | 14–16px | 600 |
| Rótulo de card | 12–14px | 500 |
| Número financeiro grande | 22–28px | 600 |
| Corpo | 13–14px | 400 |
| Texto auxiliar | 11–13px | 400–500 |

Valores monetários usam `tabular-nums` e ficam alinhados à direita nas tabelas.

## 6. Raios

| Elemento | Raio |
|---|---|
| Controles pequenos | 6px (`rounded-md`) |
| Inputs / botões | 8px (`rounded-lg` / `rounded-xl`) |
| Cards | 12px (`rounded-2xl`) |
| Containers grandes | 14–16px (`rounded-3xl`) |

Evite excesso de formatos em pílula.

## 7. Componentes

- **Cards:** borda de 1px, contraste sutil de fundo, sombra mínima ou nenhuma, padding generoso porém compacto.
- **Sidebar:** compacta, fixa ou sticky, navegação agrupada com rótulos de seção, ícones em emoji. Item ativo: escuro com `rgba(16,185,129,0.12)` e texto `#34D399`; claro com `#ECFDF5` e texto `#059669` (`bg-primary-soft text-accent`). Nunca fundo verde sólido no item inteiro. No desktop fica **recolhida (só ícones) por padrão**, expande sobre o conteúdo ao passar o mouse, e o botão do topo fixa aberta (empurrando o conteúdo) ou recolhe de novo. A preferência fica em `dcash:sidebar-pinned` (aprovado pelo usuário em 07/10/2026).
- **Top bar:** leve. Título da página, busca quando fizer sentido, notificações, perfil e ações de contexto.
- **Dashboard:** 1) KPIs (o número vem antes do rótulo, com indicador de tendência compacto) → 2) área principal de gráfico → 3) cards financeiros secundários → 4) tabelas/listas → 5) ações rápidas → 6) indicadores de status.
- **Gráficos:** superfície no tom do tema, grade sutil, rótulos de eixo apagados, esmeralda como série principal. Nada de arco-íris; cor só quando comunica significado.
- **Tabelas:** compactas, separadores de linha sutis, hover, container arredondado, badges de status, valores à direita. Sem bordas em todas as células.
- **Botões:** primário no escuro com fundo `#10B981` e texto `#07130E`; no claro com fundo `#059669` e texto `#FFFFFF`. Hover usa a esmeralda mais escura. Secundário: superfície sutil com borda. Destrutivo (vermelho) só quando necessário.
- **Inputs:** fundo sutil, borda fina, raio de 8px, anel de foco esmeralda. Escuro: `#151917` / `#29302D`. Claro: `#FFFFFF` / `#DDE4E0`.
- **Ícones (aprovado em 07/10/2026):** importe sempre de `@/components/ui/icons`, nunca direto de `lucide-react`. Ícones de **conteúdo** (dinheiro, casa, categorias, metas, módulos) são **emojis coloridos**; ícones de **controle** (setas, fechar, +/−, editar, lixeira, busca, carregando, checkbox vazio, link externo) continuam Lucide outline. Ícone novo de conteúdo: adicione o emoji no mapa de `icons.tsx`.

## 8. Responsividade

- Desktop: sidebar + conteúdo **ocupando sempre a largura total**. Nunca use container centralizado com largura máxima (`mx-auto max-w-*`) no conteúdo das páginas. Use `w-full p-4 md:p-6`. O espaço extra em telas largas vai para mais colunas no grid ou para colunas laterais mais largas, não para margens vazias.
- Tablet: sidebar compacta.
- Mobile: navegação em drawer. Cards se adaptam à largura; tabelas rolam na horizontal ou viram cards.

## 9. Regras invioláveis

- Mudanças de design mexem **somente na camada visual**. Não alteram regras de negócio, API, banco, rotas, autenticação, permissões nem funcionalidades.
- Os dois temas (escuro e claro) devem parecer o mesmo design system.
- Referência visual: dashboard escuro e cinematográfico, com superfícies em camadas, bordas sutis, cards arredondados, navegação compacta, métricas financeiras fortes e uso contido de acento, **com esmeralda no lugar do laranja**.
