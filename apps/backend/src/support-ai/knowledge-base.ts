// Conteudo copiado de dcash-base-conhecimento-suporte.md (raiz do projeto).
// Se a documentacao do produto mudar, atualize os dois arquivos manualmente.
export const SUPPORT_KNOWLEDGE_BASE = `
# DCash — Base de Conhecimento para Agente de Suporte (IA)

> Documento técnico-funcional gerado a partir da leitura direta do código-fonte do DCash (frontend Next.js em \`apps/frontend\`, backend NestJS em \`apps/backend\`). Objetivo: dar contexto factual e verificável para um agente de IA responder tickets de suporte com precisão, incluindo comportamentos não óbvios, limitações conhecidas e mensagens de erro literais.
>
> **Última atualização: 07/10/2026** — inclui Painel gerencial, módulo DCaos (add-on), novo Caça Preços/Desejos, despensa com vitrine e validade, recados com leitura manual, barra lateral recolhível, ícones em emoji e novos tutoriais guiados.
>
> Convenção deste documento: cada seção de página traz **Objetivo**, **Dados/Entidades**, **Ações do usuário**, **Regras de negócio e fórmulas**, **Comportamentos/limitações conhecidas** e **Perguntas comuns de suporte** (pergunta → resposta pronta). Use as seções "Comportamentos/limitações conhecidas" como fonte de verdade ao explicar por que algo "parece errado" para o usuário — não é sempre um bug a ser corrigido na hora, é o comportamento atual do sistema.

---

## 1. Visão geral do produto

DCash é um app de finanças pessoais e familiares (monorepo: frontend Next.js/React + backend NestJS, banco Postgres schema \`db_dtasc\`). Permite controlar contas, transações, contas fixas, parcelamentos, orçamento mensal, metas de longo prazo, lista de desejos, cofrinhos, desafios pessoais, agenda, tarefas e (em plano Pro) carteira de investimentos. Tem modelo de assinatura em 4 níveis, suporte a "grupo familiar" (dados compartilhados entre membros) e o **add-on pago DCaos** (gestão da casa: tarefas, mercado/despensa, recados, hábitos, datas e manutenção — seção 28).

Login: e-mail/senha ou Google OAuth. Pós-login redireciona para **\`/painel\` (Painel gerencial)**, a tela inicial atual. Primeiro login (\`firstLogin=true\`) redireciona para \`/plans\` (tela de escolha de plano) antes do painel.

## 2. Estrutura de navegação (menu lateral)

- **Principal** → Painel gerencial (\`/painel\`)
- **Finanças** → Dashboard financeiro (\`/dashboard-v2\`), Contas, Transações, Contas Fixas, Parcelamentos, Categorias, Planejamento
- **Metas** → Cofrinhos, Sonhos, Desejos, Desafios
- **DCaos** (add-on) → Casa (\`/dcaos\`), Quem Vai Fazer? (\`/dcaos/tarefas\`), Abastece Aí (\`/dcaos/mercado\`), Recados (\`/dcaos/recados\`), Faz Todo Dia (\`/dcaos/habitos\`), Não Esquece (\`/dcaos/datas\`), Deu Ruim (\`/dcaos/manutencao\`)
- **Organização** → Agenda (tudo) (\`/calendar\`), Tarefas (\`/todos\`)
- Investimentos, Perfil e telas de pagamento/onboarding não ficam no menu principal, são acessadas por outros links/CTAs.

**Comportamento da barra lateral (desktop):** fica **recolhida (só ícones) por padrão**. Passando o mouse, ela expande **por cima** do conteúdo e recolhe ao tirar o mouse. O botão no topo da barra ("Manter menu aberto") a fixa expandida, empurrando o conteúdo; o mesmo botão ("Recolher menu") volta ao modo recolhido. A preferência fica salva no navegador (\`localStorage['dcash:sidebar-pinned']\`). Tablet: barra só de ícones; celular: menu deslizante.

**Ícones:** desde 07/10/2026 os ícones de conteúdo do sistema são **emojis coloridos** (ex.: 👛 Contas, 🐷 Cofrinhos, 🛒 Mercado). Ícones de controle (setas, fechar, +/−, lixeira, busca, carregando) continuam de linha. O desenho do emoji varia entre Windows, Mac e celular — é normal o mesmo ícone parecer diferente em dispositivos distintos. Ícones de categoria escolhidos pelo usuário também aparecem como emoji (sem recadastro).

\`/dashboard\` (v1) e \`/plans\` **não aparecem no menu** — são páginas de fluxo, não de navegação diária. \`/dashboard\` é legado (ver seção 14).

## 3. Planos e feature gating

Planos: \`free\`, \`basico\` (R$ 9,90/mês), \`intermediario\` (R$ 19,90/mês), \`pro\` (R$ 34,90/mês). Preços hardcoded em \`PaymentService.PLAN_PRICES\` no backend.

| Feature key | Liberado a partir de |
|---|---|
| \`fixed_bills\` (Contas Fixas) | Básico |
| \`financial_challenges\` (Desafios) | Básico |
| \`export_reports\` (Exportar relatórios) | Básico |
| \`dreams_goals\` (Sonhos) | Intermediário |
| \`family_group\` (Grupo Familiar) | Intermediário |
| \`google_calendar\` (Google Agenda) | Intermediário |
| \`whatsapp_alerts\` (Alertas WhatsApp) | Pro |
| Investimentos | Pro (checagem hardcoded no backend, \`InvestmentsService.assertPro\`, não usa a tabela \`plan_features\`) |

Recursos sem gate (disponíveis em todos os planos, incl. Free): Contas, Transações, Categorias, Planejamento, Agenda (uso básico), Desejos, Cofrinhos, Tarefas.

**Plano efetivo em grupo familiar:** \`PlanService.getEffectivePlan\` retorna o **maior** entre o plano próprio do usuário e o plano do dono (criador) do grupo familiar, na ordem \`free < basico < intermediario < pro\`. Ou seja, membros de uma família herdam automaticamente o plano do dono se for superior ao próprio.

**Ativação de plano:** só ocorre via webhook do gateway de pagamento (Mercado Pago ou Stripe) quando \`payments.status = 'approved'\`. A tela \`/payment/success\` apenas faz *polling* em \`GET /payment/status\` (até 8 tentativas, 2s de intervalo) esperando essa confirmação — **não é ela quem ativa o plano**. Se o webhook atrasar ou falhar, a tela de sucesso pode aparecer mas o plano do usuário pode não ter mudado ainda.

**Admin pode alterar plano manualmente** (tela \`/admin\`, restrita a \`is_admin=true\`): essa alteração é imediata e **não gera registro em \`payments\` nem cobrança** — é um override administrativo puro, separado do fluxo real de pagamento.

**Ciclo de cobrança:** o checkout via **Stripe** aceita ciclo \`monthly\` ou \`yearly\` (\`PaymentService.createStripeSession\`); o anual cobra 12× o mensal com 20% de desconto, recorrente por ano. O mesmo vale para o add-on DCaos. Se um usuário relatar cobrança mensal tendo escolhido anual, verificar no Stripe/\`payments\` qual ciclo foi enviado na sessão antes de concluir que é bug.

## 4A. Painel gerencial — \`/painel\` (tela inicial)

**Objetivo:** juntar, numa tela, o resumo financeiro do mês e a rotina da casa (DCaos). É para onde o login, o PWA e o logo levam.

**Blocos (de cima para baixo / esquerda para direita):**
- **Cabeçalho:** "Olá, Nome 👋" + selos da família ("👨‍👩‍👧‍👦 Família X") e do mês selecionado.
- **Ações rápidas:** Nova receita, Nova despesa, menu **Finanças ▾** (criar categoria/forma de pagamento/conta fixa + atalhos para todas as telas de Finanças e Metas), menu **Casa ▾** (criar tarefa, item de mercado, recado, compromisso, hábito, data; só com DCaos) e atalhos **Calendário**, **Tarefas** (DCaos → \`/dcaos/tarefas\`; sem DCaos → \`/todos\`) e **Compras** (só com DCaos).
- **KPIs:** Saldo do mês, Receitas, Despesas, com comparação ao mês anterior.
- **Próximos dias:** 7 cards — **Hoje + 6 dias** — com tarefas, hábitos, contas fixas, eventos, datas e manutenção pendentes de cada dia, contador e saldo previsto (+R$/−R$). Clicar num card mostra o **detalhe do dia** logo abaixo (concluir tarefa, marcar hábito, ver finanças do dia, "Marcar" cria evento). Essa área sempre parte de hoje — o seletor de mês do painel **não** a afeta.
- **Despesas por categoria:** alterna Gráfico/DRE. O **DRE é colunar por membro da família** (uma coluna por pessoa do grupo, mesmo sem lançamentos, + coluna Total). Com uma pessoa só, aparece apenas o Total.
- **Desafio do mês** e **Raio-X parcelamentos** (lado a lado): o Raio-X mostra saldo devedor (% pago), parcelas do mês (pagas/total), próximo mês (variação %), quitações neste/próximo mês, parcelas vencidas e as 3 próximas quitações ("libera R$ X/mês").
- **Coluna direita:** seletor de mês, **Bilhetinhos** (só DCaos), Planejamento do mês, **resumo** (Lista de compras · Cofrinhos · Sonhos · Desejos) e **Radar da família**.

**Resumo (4 cards, regras de cor):**
- Lista de compras: amarelo se há itens a comprar; verde "Em dia" se não há; sem DCaos fica cinza e leva a \`/dcaos\`.
- Cofrinhos: total guardado e % da meta (verde ≥100%, azul a caminho).
- Sonhos: o sonho mais perto de realizar ("72% · Carro · faltam R$ X"); verde ≥75%.
- Desejos: pendentes + essenciais + total cotado; amarelo se há essencial pendente, verde "Zerada" sem pendências.

**Bilhetinhos no painel:** mostra só bilhetes **não lidos** enviados **para o usuário ou para a família toda** (inclui os que o próprio usuário mandou para a família). Bilhetes que um membro mandou só para outro membro não aparecem. Cada bilhete tem botão **"✓ Li"** (tira do painel e guarda em Recados → Meus bilhetes) e reações (seção 28.4). Até 3 por vez; o excedente aparece como "+N bilhetes no mural".

**Radar da família (insights automáticos, sem IA):** lista priorizada; itens **críticos** ficam num bloco vermelho "Precisa de atenção agora". Regras:
- 🔴 Mês no vermelho (despesa > receita); orçamento total estourado; parcelas vencidas; parcelas ≥50% da renda; manutenção urgente; ≥4 tarefas da casa atrasadas.
- 🟡 Categoria acima do limite; gastos >20% maiores que o mês anterior; sobra <5% da renda; nenhuma receita lançada; parcelas entre 30% e 50% da renda; 1–3 tarefas atrasadas; data importante em ≤2 dias; cofrinhos <10% da meta no 2º semestre.
- 🔵 Categoria concentra ≥50% dos gastos; mês sem planejamento; data importante em ≤7 dias; preventiva vencendo; itens acabando na despensa; bilhetes não lidos.
- 🟢 Sobra ≥20% da renda; gastos menores que o mês anterior; parcelamentos terminando no mês seguinte; sonho ≥75%; hábitos do dia concluídos.

**Sem DCaos:** o painel mostra um card "Conhecer o DCaos" no lugar dos blocos da casa; bilhetes e itens da casa no radar não aparecem.

## 4B. Dashboard financeiro — \`/dashboard-v2\` vs \`/dashboard\` (legado)

**Objetivo:** visão financeira detalhada do mês (era a antiga tela "Início"; agora fica em Finanças → Dashboard financeiro). Ocupa a largura total da tela.

**\`/dashboard-v2\` é o dashboard financeiro atual.** Agrega em paralelo dados de: \`/dashboard\`, \`/transactions\`, \`/transactions/installments\`, \`/todos/pending\`, \`/dreams\`, \`/categories\`, \`/wishlists\`, \`/piggy-banks\`, \`/family/members\`, \`/category-limits\`, \`/challenges\`, \`/calendar-events/monthly\`, \`/fixed-bills\`.

**Regras de negócio / fórmulas:**
- Saldo/receita/despesa do mês são recalculados **no frontend** filtrando as transações pelo mês selecionado — não usam o \`generalBalance\` retornado pelo endpoint \`/dashboard\` (esse campo é do dashboard v1).
- **DRE:** \`receitaLiquida = income − expense\`; \`resultado = receitaLiquida − totalInvest\`; \`margem = resultado / income * 100\`; \`pontoEquilibrio = expense + totalInvest\`. Badge "Superávit" se \`resultado >= 0\`, senão "Déficit". Exibido **em colunas por membro da família + Total** (componente \`DRETable\`, mesmo no Painel gerencial); os valores por membro vêm do \`userId\` das transações; resultado, margem, ponto de equilíbrio e status também são calculados por pessoa.
- Comparativo com mês anterior: receita subir = bom (verde); despesa subir = ruim (vermelho) — lógica invertida propositalmente para despesas.
- Categoria de gasto acima do valor planejado (vindo de \`/category-limits\`) ganha aviso "⚠ acima do orçamento" em vermelho.
- **Raio-X de parcelamentos:** \`% da renda comprometida = installTotal / income\`. Acima de 30%, o card muda de "Saudável" para "Atenção" (visual vermelho).
- **Checklist "Primeiros passos"** (5 itens: conta cadastrada, 1ª transação, ≥2 categorias de despesa, 1 sonho, zero tarefas pendentes). Ao completar os 5, grava \`localStorage['dcash:onboarding-done']='true'\` e **nunca mais reaparece** para aquele navegador/usuário — isso é local ao navegador, não ao servidor.

**Comportamentos/limitações conhecidas:**
- \`/dashboard\` (v1) ainda existe no código mas não é mais linkado em nenhum lugar da UI desde o commit que redirecionou os fluxos de login para \`/dashboard-v2\`. No v1, o campo \`balance\` de cada conta/cartão vem **zerado da API** (placeholder não implementado) — se um usuário acessar essa URL antiga (favorito salvo), verá saldos zerados, o que é esperado nessa tela legada, não representa perda de dados.
- O checklist "Primeiros passos" some baseado em \`localStorage\` do navegador — se o usuário trocar de navegador/dispositivo ou limpar dados do site, o checklist pode reaparecer mesmo já tendo completado os passos antes. Isso é normal, não indica perda de progresso real.

**Perguntas comuns de suporte:**
- *"Meu saldo no dashboard é diferente do que vejo em Contas."* → Esperado: o dashboard recalcula saldo/receita/despesa a partir das transações do mês selecionado; a tela Contas usa fórmulas por tipo de conta (ver seção 5). Não são o mesmo cálculo.
- *"O checklist de primeiros passos sumiu/voltou sozinho."* → Ele é controlado por \`localStorage\` do navegador, não por dado salvo no servidor.

## 5. Contas / Carteira — \`/accounts\`

**Objetivo:** cadastro de formas de pagamento — conta bancária, dinheiro, PIX, boleto, cartão de crédito, financiamento. Entidade de backend: \`payment_method\` (a UI chama de "Conta"/"Carteira").

**Ações:** criar, editar, excluir (com confirmação), filtrar por tipo em **abas** (Todos, Cartão de Crédito, Cartão de Débito, Dinheiro, PIX, Boleto, Financiamento — cada aba com contador; "Todos" mostra as seções agrupadas). Cartões aparecem como "skins" de cartão; dinheiro como cédula.

**Fórmula de saldo (\`payment-methods.service.ts\`):**
- **Cartão de crédito / financiamento:** \`saldo = payment_limit − SOMA(amount das transações com is_paid=false)\`. É o **limite disponível**, não dinheiro em caixa.
- **Dinheiro / PIX / boleto:** \`saldo = SOMA(receitas) − SOMA(despesas)\` de todas as transações vinculadas àquela conta (pagas ou não).

**Comportamentos/limitações conhecidas:**
- O card "Saldo Total" da tela soma indiscriminadamente saldo de contas correntes com **limite disponível** de cartões — pode inflar o número exibido para quem tem cartões com bastante limite livre. Isso é comportamento atual, não um erro de cálculo pontual.

**Perguntas comuns de suporte:**
- *"Meu saldo total está muito alto, mas não tenho esse dinheiro todo."* → Confirmar se o usuário tem cartões de crédito cadastrados: o valor exibido para cartão é limite disponível, somado ao saldo total junto com contas de dinheiro/PIX/boleto.

## 6. Transações — \`/transactions\`

**Objetivo:** extrato completo de lançamentos, com filtros e edição em lote.

**Ações:** lançar (Receita/Despesa/Investimento), marcar como pago (individual ou lote), editar, excluir, importar OFX (atalho para \`/payments/import\`).

**Regras de negócio (\`transactions.service.ts\`):**
- **Parcelamento** (\`handleInstallments\`): valor de cada parcela = \`amount / total_installments\`, arredondado a 2 casas — a soma das parcelas pode não bater centavo a centavo com o valor total original por causa do arredondamento. Se a forma de pagamento é cartão de crédito com \`closingDay\`/\`dueDay\` configurados e a compra foi feita **depois do dia de fechamento**, a 1ª parcela é automaticamente empurrada para o mês seguinte (regra de fatura de cartão).
- **Receita/despesa recorrente:** \`POST /transactions/recurring\` gera até 120 ocorrências (mensal/semanal/quinzenal). Só despesas recorrentes recebem \`installment_group\` (para entrar no relatório de Parcelamentos).
- **Aporte em cofrinho:** cria uma transação tipo \`EXPENSE\` vinculada a \`piggyBankId\`; o valor só é somado ao \`piggy_bank.balance\` **quando a transação é marcada como paga** (\`markAsPaid\`) — um aporte pendente não afeta o saldo do cofrinho ainda.
- **Investimento em Sonho sem cofrinho vinculado:** soma direto em \`dream_goal.saved_value\` via \`PATCH /dreams/:id/progress\`.
- **Exclusão de parcela:** apagar uma parcela isolada remove só ela; há opção separada para excluir o \`installment_group\` inteiro (todas as parcelas do parcelamento).
- **Importação (OFX/CSV):** deduplicação por hash SHA-256 de \`data|valor|descrição|userId\` — evita duplicar lançamentos reimportados, mas só detecta duplicata exata (pequenas variações de texto do banco, como espaços extras, não são detectadas e podem duplicar).

**Comportamentos/limitações conhecidas:**
- Badges: "Pago" (verde) / "Pendente" (vermelho); ícones: 📅 conta fixa vinculada, ícone de camadas = parcelado, 🐷 = aporte de cofrinho.

## 7. Categorias — \`/categories\`

**Objetivo:** organizar receitas/despesas/reservas com cor e ícone. Três tipos: \`income\`, \`expense\`, \`reserve\`.

**Ações:** criar/editar (com preview ao vivo de cor/ícone), excluir. Se a exclusão falhar (categoria em uso), a API retorna mensagem de erro exibida diretamente ao usuário via alerta.

## 8. Contas Fixas — \`/fixed-bills\` (plano Básico+)

**Objetivo:** despesas recorrentes mensais (aluguel, luz, internet, fatura de cartão).

**Gate de plano:** envolvida por \`<PlanGate feature="fixed_bills">\`. Usuário Free vê aviso "Recurso disponível no plano Básico ou superior" com CTA "Ver planos" → \`/profile\` / \`/plans\`.

**Tipos retornados por \`GET /fixed-bills?month&year\`** (ordenados por dia de vencimento):
1. \`transaction\` — conta comum que já gerou uma transação individual no mês (editável via Transações).
2. \`aggregation\` — regra cadastrada como "Apenas como regra" (não gera transações automáticas, é só lembrete visual).
3. \`card\` — fatura de cartão: valor = soma automática de todas as transações \`CREDIT_CARD\` daquele cartão no mês; não editável manualmente, sem categoria própria.

**Criação:**
- **Conta Comum:** descrição, valor, dia de vencimento, categoria, data-fim opcional. Sem data-fim, o backend gera lançamentos automaticamente até \`addMonths(hoje, 11)\` (12 meses à frente). Toggle "gerar lançamentos automáticos" vs "apenas como regra".
- **Cartão de Crédito:** vincula a um cartão já cadastrado; dia de vencimento vem automaticamente do \`dueDay\` do cartão (somente leitura); vínculo permanente, sem valor manual, sem data-fim.

**Exclusão:** remove a regra e todas as transações **futuras não pagas** vinculadas. Transações já pagas no passado não são apagadas.

**Perguntas comuns de suporte:**
- *"Exclui uma conta fixa e sumiu um lançamento de mês passado que eu já tinha pago."* → Não deveria acontecer pela lógica do sistema (só remove futuras não pagas); escalar como possível bug/investigar caso específico.
- *"Não consigo criar conta fixa."* → Checar plano do usuário; recurso exige Básico ou superior.

## 9. Parcelamentos — \`/installments\`

**Objetivo:** relatório consolidado (somente leitura) de compras parceladas, agrupadas por \`installmentGroup\`. Ações reais (criar/editar/excluir) acontecem em Transações.

**Cálculos:** \`remainingValue\` = soma das parcelas com \`isPaid=false\`; grupo com \`countRemaining=0\` recebe badge "Quitado". Painel de insights mostra saldo devedor total, comparação de parcelas deste mês vs próximo, parcelamentos que começam/terminam no mês.

## 10. Planejamento — \`/planning\` (⚠️ não confundir com \`/plans\`)

**Esclarecimento crítico:** \`/planning\` (menu "Planejamento") = orçamento mensal por categoria. \`/plans\` (fora do menu) = tela comercial de preços/assinatura, sem nenhuma relação de código com \`/planning\`. Se um usuário disser "não encontro meu planejamento" tendo ido em "Planos", oriente para \`/planning\`.

**Fórmula (\`category-limits.service.ts\`, \`getYearlyStatus\`):** \`totalSpent\` soma apenas despesas cujas categorias **têm limite definido naquele mês** (não é o gasto total do mês); \`percent = totalSpent / totalPlanned * 100\` (0 se não há planejamento no mês).

**Fluxo de criação (2 passos):**
1. Receita prevista + slider de "Meta de Reserva" (0–50%): \`reserveAmt = income * pct/100\`; \`available = income − reserveAmt\`.
2. Distribuição por categoria de despesa, com "Restante" (\`available − distribuído\`, fica vermelho se negativo).

Botão "Replicar mês anterior" copia valores do mês passado. Salvar grava um \`POST /category-limits\` por categoria com valor > 0 e remove (\`DELETE\`) as zeradas/removidas.

**Indicadores:** badge "Atual" no mês corrente; barra vermelha se \`percent > 100\`; "Sem planejamento" para meses vazios.

## 11. Importação de Extrato — \`/payments/import\`

**Fluxo:** upload de \`.ofx\` ou \`.csv\` → parse (regex de tags OFX \`<STMTTRN>\`/\`<DTPOSTED>\`/\`<TRNAMT>\`/\`<NAME>\`, ou colunas CSV \`date\`/\`title\`|\`description\`/\`amount\`) → hash SHA-256 por linha (\`data|valor(2 casas)|descrição(lowercase/trim)|userId\`) para detectar duplicatas contra transações já confirmadas → tela de revisão (linhas duplicadas ficam em amarelo, desabilitadas) → \`POST /transactions/import/confirm\`.

**Comportamentos/limitações conhecidas (importantes para suporte):**
- **Toda transação confirmada na importação é gravada com \`type: 'EXPENSE'\` fixo**, independentemente do sinal do valor no extrato original. Um PIX recebido ou depósito importado aparece como despesa no sistema. É preciso editar manualmente para "receita" depois da importação.
- O texto de ajuda da própria tela afirma que "o saldo dos cofrinhos é atualizado automaticamente" após a importação — **isso não corresponde ao comportamento real do backend**; não existe vínculo cofrinho↔transação implementado nesse fluxo específico. Se o usuário reclamar que o cofrinho não atualizou após importar extrato, isso é esperado no estado atual, não é bug pontual — é uma mensagem de ajuda desalinhada com o comportamento real.
- Deduplicação é por hash exato; pequenas variações na descrição (espaços extras, etc.) do banco fazem a "mesma" transação passar como nova, podendo duplicar.

## 12. Sonhos — \`/dreams\` (plano Intermediário+)

**Objetivo:** metas de longo prazo com imagem, valor-alvo e prazo.

**Regra de negócio central:** quando o sonho está vinculado a um cofrinho (\`piggyBankId\`), o backend **ignora** o \`saved_value\` gravado na própria linha da tabela \`dream_goal\` e retorna sempre \`COALESCE(p.balance, d.saved_value)\` — ou seja, o valor exibido como "reservado" é sempre o saldo atual do cofrinho vinculado, atualizado automaticamente a cada depósito/retirada.

Progresso = \`min(savedValue/targetValue*100, 100)\`. Badge "Meta Alcançada!" quando ≥100%.

**Comportamentos/limitações conhecidas:** se o modo escolhido for "Manual" e o usuário nunca atualizar o valor guardado, o progresso fica estático — não há sincronização automática nesse modo (diferente do modo vinculado a cofrinho).

## 13. Desejos (Wishlist) — \`/wishlists\`

**Objetivo:** lista de produtos desejados + comparador de preços ("Caça Preços"), com insights de compra.

**Tela:** KPIs (Total da lista = soma da melhor oferta dos pendentes; Essenciais; Guardado em cofrinhos e % da lista coberta; Conquistados); abas Pendentes/Adquiridos/Todos; busca, filtro de prioridade e ordenação; cards com melhor oferta e loja, parcelamento, economia, selos "frete grátis", "cabe nos cofrinhos" e dias na lista; botão **Comprei/Desfazer** direto no card.

**Insights (coluna direita):** próxima compra sugerida (maior prioridade com cotação, mais barata); desejos sem cotação; economia pesquisando (diferença entre a cotação mais cara e a mais barata); **regra dos 30 dias** (desejos há ≥30 dias na lista já passaram do período de reflexão; <30 dias "ainda esfriando"); quanto da lista os cofrinhos cobrem e o que dá para comprar à vista; item mais pesado; frete grátis; distribuição por prioridade.

**Cadastro do desejo:**
- A **imagem não é mais enviada por upload**: o usuário clica no quadro "Buscar imagem" e escolhe entre até 18 imagens da web (Google Imagens via SerpAPI, \`GET /wishlists/search-images?q=\`). Ao aplicar, o sistema testa a imagem original; se o site bloquear, salva a miniatura do Google. Também é possível colar um link de imagem manualmente.
- Lupa ao lado do nome busca **ofertas**; escolher uma preenche foto/link e vira a 1ª cotação. Sem busca, o campo "Preço que você viu" cria uma cotação com a loja deduzida do link.
- "Abrir o caça preços depois de salvar" (marcado por padrão) abre o modal de cotações em seguida.

**Caça Preços (modal):** abas Cotações / Buscar online / Adicionar manual.
- Cotações: ordenadas da mais barata, com diferença para a melhor (+R$ e %), barra comparativa, juros do parcelamento ("x% de juros" ou "sem juros") e botão **"Comprei aqui"** (marca o desejo como adquirido).
- Buscar online: filtros "Só novos" e "Frete grátis", ordenação por preço, selo "mais barato" e "R$ X abaixo" da melhor cotação; dá para salvar várias sem sair da aba. Se o desejo não tem foto, a 1ª oferta salva preenche a imagem.
- Manual: colar o link preenche a loja; máscara de R$; parcelamento 1–24× com cálculo de juros; prévia comparando com a melhor cotação; "Salvar e adicionar outra".

**Regras de negócio:**
- "Melhor oferta" = menor \`cashPrice + shipping\` (valores convertidos para número no frontend).
- Busca online (ofertas e imagens) usa SerpAPI; depende de \`SERPAPI_KEY\` — ausente, a API retorna \`{noKey:true}\` e a UI mostra aviso e oferece o modo manual. **Cota: 100 buscas/mês no plano gratuito do SerpAPI**, compartilhada entre ofertas e imagens. O frontend reaproveita resultados do mesmo termo durante a sessão para economizar.
- Ofertas importadas da busca são salvas com \`shipping = 0\` (a busca não informa o valor do frete, só se é grátis). O frete real deve ser conferido na loja ou ajustado numa cotação manual.

**Perguntas comuns de suporte:**
- *"O frete da oferta importada está zerado."* → Esperado: a busca online não traz o valor do frete; conferir na loja.
- *"A busca de imagem/oferta parou de funcionar."* → Possível fim da cota mensal do SerpAPI ou chave ausente; o modo manual continua funcionando.
- *"A imagem do desejo sumiu."* → O site de origem pode ter removido/bloqueado a imagem; escolher outra pelo "Buscar imagem".

**Achado de segurança (pendente):** \`DELETE /wishlists/prices/:priceId\` não valida escopo do usuário/família — qualquer usuário autenticado com o id de uma cotação consegue apagá-la. Correção sugerida: filtrar pelo escopo como os demais endpoints.

## 14. Cofrinhos — \`/piggy-banks\`

**Fórmula de progresso (\`piggy-banks.service.ts\`):** \`progress = round(min(balance/goal*100, 100)*10)/10\`, onde \`goal = yearlyGoal || monthlyGoal || 1\`.

**Edge case importante:** se o usuário não define nenhuma meta (nem mensal nem anual), \`goal\` vira \`1\` — qualquer saldo ≥ R$1 já mostra ~100% de progresso e badge "Concluído!". Isso é matematicamente esperado dado o fallback \`|| 1\`, não é bug de arredondamento.

**Retirada:** exige \`balance >= amount\`; senão retorna erro **"Saldo insuficiente ou cofrinho não encontrado."** — mensagem genérica que cobre dois cenários diferentes (saldo insuficiente OU ID inexistente/sem permissão). Depósito/retirada exigem \`amount > 0\` (erro: "Valor deve ser positivo.").

"Arquivar" é soft-delete (\`active=false\`) — não apaga o histórico.

**Perguntas comuns de suporte:**
- *"Meu cofrinho mostra 100% com muito pouco dinheiro guardado."* → Perguntar se há meta mensal/anual definida; se não, essa é a causa (fallback de meta = R$1).
- *"Recebi 'Saldo insuficiente ou cofrinho não encontrado' ao tentar retirar."* → Pode ser tanto saldo insuficiente quanto problema de permissão/ID; confirmar saldo atual do cofrinho com o usuário antes de escalar.

## 15. Desafios — \`/challenges\` (plano Básico+)

**Objetivo:** diário mensal manual de metas pessoais (não é gamificação automática — sem pontos, streaks ou recompensas). Um registro por mês/ano/escopo (upsert). Status: "Não iniciada" / "Em andamento" / "Concluída". "Performance anual" = \`concluídos/total * 100\`.

## 16. Tarefas — \`/todos\`

Lista simples de afazeres (as **tarefas da casa com responsável e repetição** ficam no DCaos → Quem Vai Fazer?, seção 28.2). Escopo automático: se o usuário pertence a um grupo familiar, a tarefa criada é automaticamente \`family_group_id\` (visível a todos); senão é estritamente pessoal (\`user_id\`). Sem prioridade, prazo ou atribuição.

## 17. Agenda — \`/calendar\` ("Agenda (tudo)")

Agenda unificada: eventos próprios + contas fixas + transações do mês e, para quem tem DCaos, as camadas **Tarefas** (inclui recorrências projetadas), **Hábitos** (resumo diário), **Datas** importantes e **Manutenção** preventiva (\`GET /dcaos/calendar\`). Chips no topo ligam/desligam cada camada. Painel lateral mostra o dia selecionado (concluir tarefa, marcar hábito) e "Próximos dias". Clique duplo num dia cria evento. Com DCaos, eventos podem ter participantes da família (\`/dcaos/agenda\`); \`/dcaos/agenda\` redireciona para \`/calendar\`. Evento pode ter alerta por WhatsApp (Pro) e sincronizar com Google Agenda (Intermediário+, requer conexão OAuth prévia no Perfil). O Painel gerencial usa o mesmo componente no modo "próximos dias" (seção 4A).

## 18. Investimentos — \`/investments\` (exclusivo Pro)

**Gate:** checado tanto no frontend (\`GET /plan/me\`) quanto no backend (\`InvestmentsService.assertPro\`, lança \`ForbiddenException\` — não usa a tabela \`plan_features\`, é checagem direta de \`plan==='pro'\`).

**Dados:** posições de carteira (ticker, quantidade, preço médio); preços ao vivo vêm de um microsserviço externo Python (\`MARKET_SERVICE_URL\`); alertas de preço (\`above\`/\`below\`).

**Regras:**
- P&L = \`Σ(quantidade × preço atual) − Σ(quantidade × preço médio)\`; se o preço ao vivo falhar, usa o preço médio como fallback (sem P&L real nesse caso).
- Alertas: job verifica \`price >= target\` (direção \`above\`) ou \`price <= target\` (direção \`below\`); ao disparar, marca \`triggered_at\` e **desativa o alerta automaticamente** — não reativa sozinho, precisa criar um novo.
- Ticker normalizado para maiúsculas; sufixo \`.SA\` adicionado automaticamente se ausente.
- Erro de busca comum: **"Ação não encontrada. Verifique o ticker (ex: ITSA4 ou MXRF11)."**

## 19. Admin — \`/admin\` (restrito a \`is_admin=true\`)

Gestão de \`plan_features\` (matriz de recursos por plano) e usuários (alterar plano, tornar/remover admin). Requisição sem \`is_admin\` retorna 403 (tela "Acesso restrito"). Alterações aqui são imediatas e não passam pelo fluxo de pagamento (ver seção 3).

## 20. Onboarding — \`/onboarding\` e \`/onboarding/setup\`

**Achado crítico para suporte:** \`/onboarding/setup\` (wizard de 5 passos: dados pessoais, família, categorias, formas de pagamento, planejamento) **não faz nenhuma chamada de API** — é inteiramente decorativo. Nada que o usuário preencher ali (nome, telefone, categorias, cartões, limites) é salvo. O botão final apenas navega para \`/dashboard-v2\`.

Isso é uma fonte previsível de tickets de suporte: usuário relata "preenchi meus dados no onboarding mas não aparecem no meu perfil/categorias/contas". **Resposta padrão:** oriente o usuário a configurar essas informações diretamente nas telas reais — Perfil, Categorias, Contas, Planejamento — pois o assistente de boas-vindas serve apenas como introdução visual ao app.

\`/onboarding\` (wizard simplificado de 3 telas, diferente do \`/setup\`) também não envia a escolha de objetivo do usuário a nenhuma API — fica só em estado local do navegador.

## 21. Pagamento / Assinatura — \`/payment\`, \`/payment/success\`, \`/payment/failure\`, \`/payment/pending\`

**Gateways:** Mercado Pago (Preference API — PIX/cartão/boleto) e Stripe (Checkout Session, modo assinatura).

**Tabela \`payments\`:** \`user_id, plan, amount, provider_preference_id, provider_payment_id, status, provider\`. \`users.plan\` só muda quando \`status='approved'\`, via webhook.

- **\`/payment/success\`:** faz polling em \`GET /payment/status\` (até 8× / 2s); mostra "Confirmando pagamento..." → "Pagamento confirmado!" ou, se expirar sem confirmação, "Pagamento em análise" (não significa que falhou, só que o webhook ainda não chegou).
- **\`/payment/failure\`:** nenhuma cobrança foi feita; oferece "Tentar novamente".
- **\`/payment/pending\`:** explica que boleto pode levar até 3 dias úteis; PIX/cartão costuma ser quase imediato.

**Perguntas comuns de suporte:**
- *"Paguei mas meu plano não mudou."* → Verificar status em \`payments\` para o \`provider_payment_id\`/\`provider_preference_id\` correspondente; se \`approved\` mas \`users.plan\` não refletiu, é falha no processamento do webhook — escalar para engenharia. Se \`pending\`, orientar aguardar confirmação do gateway (especialmente boleto).
- *"Escolhi o plano anual mas fui cobrado o valor mensal."* → Esperado no estado atual: não existe cobrança anual real implementada, o toggle de desconto anual em \`/plans\` é apenas visual.

## 22. Perfil e Família — \`/profile\`

**Dados:** vem de \`GET /auth/me\` + \`GET /family/members\`.

**Regras de negócio:**
- Alertas por WhatsApp exigem plano **Pro** e telefone cadastrado (sem telefone, toggle fica desabilitado com aviso "Cadastre seu número acima para ativar.").
- Renomear grupo familiar só é permitido para \`familyGroup.isOwner\` (validado também no backend com \`ForbiddenException\`).
- Código de convite tem formato fixo \`DCASH-XXXXXX\` (hex de 3 bytes, maiúsculo).
- Se \`GET /auth/me\` falhar, a tela mostra banner vermelho com botão "Tentar novamente" (não fica em branco).

## 23. Login / Auth — \`/login\`, \`/auth-success\`

**Validações de registro:** e-mail deve casar com \`/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/\`; senha mínima 6 caracteres; confirmação deve coincidir. Mensagens: "Digite um e-mail válido.", "Mínimo de 6 caracteres.", "As senhas não coincidem."

**Login social:** botão "Continuar com Google" linka direto para \`\${API}/auth/google\` (Passport OAuth); callback redireciona para \`/auth-success?token=...&firstLogin=...\`. Sem \`token\` na querystring, força volta para \`/login\`.

**Redirecionamento pós-login:** \`firstLogin=true\` → \`/plans\`; caso contrário → \`/painel\`.

**Login com Google:** desde 07/10/2026 o \`id\` do usuário também é salvo no navegador (\`dcash:user\`), e telas que dependem de "quem sou eu" leem o \`id\` do token quando ele falta. Antes disso, usuários do Google podiam ver bilhetes e reações do DCaos sem identificação correta (ex.: painel dizendo "Ninguém deixou recado ainda"); se um usuário antigo relatar isso, basta recarregar a página.

**"Esqueci a senha":** sempre mostra tela de sucesso ("E-mail enviado!") mesmo que o e-mail não exista no sistema — comportamento intencional de segurança (não revela quais e-mails estão cadastrados). Orientar usuário a checar se digitou o e-mail correto (o mesmo do cadastro) e a caixa de spam.

## 24. Regras transversais

**Multi-tenant / escopo familiar:** praticamente todo módulo de dados (contas, transações, categorias, contas fixas, sonhos, desejos, cofrinhos, desafios, tarefas) segue o padrão: se \`users.family_group_id\` está definido, os registros são filtrados/compartilhados por \`family_group_id\`; caso contrário, filtro é \`user_id = X AND family_group_id IS NULL\`. Ou seja, ao entrar num grupo familiar, o usuário passa a ver (e compartilhar) dados de todo o grupo nessas áreas.

**Persistência técnica:** a maior parte dos serviços do backend usa SQL cru via \`DatabaseService.query()\` (schema \`db_dtasc\`), não repositórios TypeORM — exceção notável é \`dashboard.service.ts\`, que usa \`@InjectRepository\`. Entidades TypeORM existentes: \`category-limit\`, \`category\`, \`debt\`, \`debtor\`, \`dream-goal\`, \`family-group\`, \`financial-challenge\`, \`fixed-bill\`, \`payment-method\`, \`piggy-bank\`, \`price-hunting\`, \`todo\`, \`transaction\`, \`user\`, \`wishlist\`. Não há entidade separada para "conta bancária" (é \`payment_method\`) nem para "parcela" (é apenas \`transaction\` com \`installment_group\`/\`installment_number\`/\`total_installments\`).

## 25. Mapa de módulos backend (referência rápida)

| Feature | Módulo | Tabela(s) principal(is) |
|---|---|---|
| Contas | \`payment-methods/\` | \`payment_method\` |
| Transações | \`transactions/\` | \`transaction\` |
| Categorias | \`categories/\` | \`category\` |
| Planejamento | \`category-limits/\` | \`category_limit\` |
| Contas Fixas | \`fixed-bills/\` | \`fixed_bill\` |
| Agenda | \`calendar-events/\` | (eventos de calendário) |
| Dashboard | \`dashboard/\` | (agrega múltiplas tabelas via TypeORM) |
| Planos/assinatura | \`plan/\`, \`payment/\` | \`plan_features\`, \`payments\`, \`users.plan\` |
| Sonhos | \`dreams/\` | \`dream_goal\` |
| Desejos | \`wishlist/\` | \`wishlist\`, \`price_hunting\` |
| Cofrinhos | \`piggy-banks/\` | \`piggy_bank\` |
| Desafios | \`challenges/\` | \`financial_challenge\` |
| Tarefas | \`todos/\` | \`todo\` |
| Investimentos | \`investments/\` | \`investments\`, \`investment_alerts\` |
| Família | \`family/\` | \`family_groups\`, \`users.family_group_id\` |
| Importação de extrato | \`transactions/\` (mesmo módulo) | \`reconciliation_staging\`, \`transaction\` |
| Admin | \`admin/\` | \`plan_features\`, \`users\` |
| DCaos (add-on) | \`dcaos/\` | \`addon_subscriptions\`, \`dcaos_pantry_items\`, \`dcaos_notes\`, \`dcaos_habits\`, \`dcaos_habit_checks\`, \`dcaos_important_dates\`, \`dcaos_maintenance\`, \`dcaos_notifications\`, \`dcaos_notification_prefs\`, \`push_subscriptions\`, \`todo\` (tarefas da casa) |
| Tutoriais guiados | \`guided-tours/\` | \`guided_tours\`, \`guided_tour_steps\` |
| Score financeiro | \`financial-score/\` | — módulo existe no backend mas **não está exposto em nenhuma página do frontend atualmente**; não mencionar como funcionalidade disponível ao usuário. |

## 26. Resumo de mensagens de erro literais conhecidas (útil para busca/grep de tickets)

- "Recurso disponível no plano Básico ou superior." — gate de plano em Contas Fixas.
- "Saldo insuficiente ou cofrinho não encontrado." — retirada de cofrinho.
- "Valor deve ser positivo." — depósito/retirada de cofrinho com valor ≤ 0.
- "Ação não encontrada. Verifique o ticker (ex: ITSA4 ou MXRF11)." — busca de ativo em Investimentos.
- "Cadastre seu número acima para ativar." — toggle de WhatsApp sem telefone cadastrado no Perfil.
- "Digite um e-mail válido." / "Mínimo de 6 caracteres." / "As senhas não coincidem." — validação de registro em \`/login\`.
- "Usuário ou senha inválidos." — erro genérico de login.
- "Destinatário não faz parte da família." — recado do DCaos enviado para alguém fora do grupo.
- "Não foi possível anotar." / "Não foi possível adicionar." — falha ao incluir item no mercado (DCaos).
- "Busca online indisponível" — SerpAPI sem chave ou indisponível (Caça Preços / busca de imagem).

## 27. Checklist rápido para triagem de suporte

1. **Dúvida sobre saldo estranho** → checar se envolve cartão de crédito (limite disponível ≠ dinheiro em caixa) — seção 5.
2. **"Não consigo usar [recurso]"** → checar plano do usuário e a tabela de feature gating (seção 3).
3. **"Preenchi algo no cadastro inicial e não salvou"** → onboarding/setup é decorativo, não salva nada (seção 20).
4. **"Importei extrato e apareceu errado"** → tudo entra como despesa; frete de wishlist sempre 0; cofrinho não atualiza sozinho (seções 11 e 13).
5. **"Paguei e não mudou o plano"** → checar status do webhook/pagamento antes de qualquer ação manual (seção 21).
6. **"Cofrinho com 100% de progresso estranho"** → checar se há meta definida (seção 14).
7. Sempre confirmar se o usuário está em um **grupo familiar**, pois isso muda o escopo de visibilidade de quase todos os dados (seção 24).
8. **"Não vejo Casa/Mercado/Recados"** → o usuário precisa do add-on DCaos ativo (seção 28.1); admins sempre têm acesso.
9. **"O bilhete sumiu do painel"** → foi marcado como "Li" (está em Recados → Meus bilhetes) ou foi enviado só para outra pessoa (seção 28.4).
10. **"Não recebo notificação no celular"** → checar permissão do navegador, se instalou o app (PWA no iPhone), horário de silêncio e módulos silenciados (seção 28.8).
11. **"O menu lateral some/fica pequeno"** → comportamento padrão: recolhido, abre ao passar o mouse; botão do topo fixa aberto (seção 2).

## 28. DCaos — add-on de gestão da casa (\`/dcaos/*\`)

### 28.1 Acesso e cobrança
- Add-on pago **separado do plano** (não altera \`users.plan\`). Preço em \`DCAOS_PRICE\` (\`dcaos-access.service.ts\`): **R$ 12,90/mês**; anual com 20% de desconto. Checkout Stripe com referência \`addon|dcaos|userId|ciclo\`; o webhook grava em \`addon_subscriptions\`.
- **Uma assinatura cobre a família inteira** (todos os membros do grupo do comprador). **Admins sempre têm acesso.**
- Sem acesso, as páginas \`/dcaos/*\` mostram a tela de venda (DcaosGate) e o painel mostra o card "Conhecer o DCaos". Backend protegido por \`DcaosGuard\`.
- Os dados seguem o escopo familiar (seção 24).

### 28.2 Quem Vai Fazer? — \`/dcaos/tarefas\`
Tarefas da casa (tabela \`todo\`, estendida) com **responsável**, prazo e **repetição**: diária, semanal **em dias escolhidos** (ex.: seg/qua/sex), quinzenal ou mensal. Concluir uma tarefa recorrente gera a próxima ocorrência. Placar de quem mais concluiu. Cron diário 9h avisa atrasadas. **Hábitos pessoais não ficam aqui** (ficam em Faz Todo Dia).

### 28.3 Abastece Aí — \`/dcaos/mercado\`
- Abas **Lista de compras** e **Despensa** (mesma tabela \`dcaos_pantry_items\`).
- Adição inteligente: "2 kg açúcar", "3 leite", "1 dz ovos" preenchem quantidade, unidade (un, kg, g, L, ml, dz, pct, cx, lata, garrafa) e categoria sugeridas.
- **Lista de compras:** lista corrida (sem blocos), ordenada por categoria do mercado (Hortifruti → Açougue → Laticínios → Padaria → Mercearia → Bebidas → Limpeza → Higiene → Pets → Outros) e depois por ordem alfabética; colunas Item, Categoria, Quem anotou, Quantidade. "Modo mercado": marcar o que foi pro carrinho e **Finalizar compra** devolve os itens para a despensa (somando a quantidade), registra a data de compra e avisa a família.
- **Despensa:** "Usei" baixa a quantidade; **"Acabou!"** zera e coloca na lista avisando a família. **Avisar com** (estoque mínimo): ao chegar nesse nível o item vai sozinho para a lista.
- **Vitrine de produtos:** catálogo com 64 produtos comuns ilustrados (emoji), cada um com quantidade típica, nível de aviso e **validade média** sugeridos e editáveis; adiciona vários de uma vez. Produtos que já existem na despensa ficam marcados "Já na despensa".
- **Validade:** campo \`shelf_life_days\` (1–3650). A data estimada = última compra (ou data de cadastro com estoque) + validade. Card mostra "vence em ~Nd" (amarelo ≤3 dias) ou "venceu há Nd" (vermelho). É **estimativa média**, não lê a validade da embalagem.
- Adicionar um nome que já existe atualiza o item existente (não duplica).

### 28.4 Recados — \`/dcaos/recados\`
- Recado para a família toda ou para uma pessoa, com cor e opção de fixar.
- Abas: **Mural** (não lidos para você/família + fixados), **Meus bilhetes** (já lidos, com busca) e **Enviados** (os seus, com "visto por N").
- **Abrir a página não marca nada como lido.** O recado só sai do mural quando o usuário clica **"Marcar como lido"** (ou "Marcar todos como lidos"). Fixados continuam visíveis no mural mesmo lidos.
- Desde 07/10/2026 **o autor não é marcado como leitor automaticamente**: recados que ele manda para a família aparecem para ele também até marcar "Li". Recados criados antes dessa data já vêm como lidos para o autor.
- "Visto por N" conta só outras pessoas.
- **Reações** (estilo WhatsApp/Instagram): ❤️ Amei, 👍 Curti, 😂 Haha, 😮 Uau, 😢 Triste, 😡 Bravo. **Uma reação por pessoa** (escolher outra troca; tocar na mesma remove). No painel, tocar duas vezes no texto envia ❤️. Reagir não marca como lido.
- A API devolve os 100 recados mais recentes; recados muito antigos podem não aparecer em "Meus bilhetes".

### 28.5 Faz Todo Dia — \`/dcaos/habitos\`
Hábitos **pessoais** (saúde, estudo, bem-estar) com dias da semana, sequência (streak) e lembrete. Cron de hora em hora. Tarefas domésticas não devem ser cadastradas como hábito.

### 28.6 Não Esquece — \`/dcaos/datas\`
Aniversários, datas comemorativas, documentos e outros, anuais ou não, com "avisar N dias antes". Cron diário 8h. Aparecem na Agenda e no Radar do painel.

### 28.7 Deu Ruim — \`/dcaos/manutencao\`
Problemas (com prioridade; urgentes aparecem em vermelho no Radar) e manutenções preventivas com próxima data. Cron diário 9h30.

### 28.8 Notificações (Web Push / PWA)
- O DCash é instalável como app (PWA). Notificações push chegam no celular/computador quando o usuário permite no navegador.
- Preferências por usuário: módulos silenciados e **horário de silêncio**. Também existe o feed interno "O Sistema Lembrou".
- iPhone: push só funciona com o app **adicionado à tela de início** (limitação do iOS).
- Mensagens têm tom bem-humorado/provocativo por design.

### 28.9 Casa — \`/dcaos\`
Resumo da rotina: saudação com atalhos (Tarefa, Mercado, Deu ruim), insights do dia, "Quem tem o que fazer hoje", lista de compras de papel, bilhetinhos, mini calendário, placar e atalhos para todos os módulos.

## 29. Tutoriais guiados

Lista no menu do avatar (topo direito). Tutoriais padrão (criados automaticamente no banco se não existirem; depois o admin pode editar em \`/admin\`):
- **Conhecendo o Painel Início** (\`dashboard-intro\`) — Dashboard financeiro e Transações.
- **Conhecendo o Painel gerencial** (\`painel-intro\`) — 11 passos pelo \`/painel\`.
- **DCaos: a casa organizada** (\`dcaos-intro\`) — Casa e todos os módulos.
- **Abastece Aí: lista e despensa** (\`dcaos-mercado\`) — lista, adição inteligente, despensa e vitrine.
- **Recados e bilhetinhos** (\`dcaos-recados\`) — escrever, abas, "Li" e reações no painel.

Os tutoriais do DCaos só funcionam para quem tem o add-on (sem ele, os elementos não existem na tela e o passo falha com aviso). Passos que exigem bilhetes no painel também dependem do DCaos. Alvos disponíveis estão em \`guided-tours/target-catalog.ts\` (atributo \`data-tour\` no frontend).
`;
