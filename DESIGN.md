---
name: LashOS
description: Gestão para lash designers autônomas, um caderno de trabalho limpo e calmo no celular e no PC.
colors:
  background: "#F3F3F6"
  surface: "#FFFFFF"
  surface-sunken: "#F4F4F7"
  surface-muted: "#FAFAFB"
  ink: "#17151E"
  ink-soft: "#5E5B68"
  ink-faint: "#77747F"
  line: "#E8E8ED"
  line-strong: "#D9D9E0"
  accent: "#2A2240"
  accent-hover: "#3A3156"
  accent-soft: "#EFEDF5"
  accent-glow: "#B9B2CF"
  accent-ink: "#FFFFFF"
  success: "#17703F"
  success-soft: "#E4F4EA"
  warning: "#8A5300"
  warning-soft: "#FDF3DC"
  danger: "#B42318"
  danger-soft: "#FDECEA"
  cat-aplicacao: "#EEEBF7"
  cat-aplicacao-line: "#D8D1EE"
  cat-manutencao: "#E6F3EB"
  cat-manutencao-line: "#C7E3D1"
  cat-lifting: "#FCEFE4"
  cat-lifting-line: "#F2D7BF"
  cat-outro: "#F4F4F7"
  cat-outro-line: "#E2E2E8"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  display-lg:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  figure-hero:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.04em"
    fontFeature: "'tnum'"
  figure:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "'tnum'"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  title-sm:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'cv11', 'ss01'"
  body-sm:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.375
    fontFeature: "'cv11', 'ss01'"
  button:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14.5px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
  hint:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.375
  caption:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
rounded:
  block: "12px"
  input: "14px"
  group: "18px"
  card: "22px"
  panel: "24px"
  sheet: "28px"
  full: "9999px"
spacing:
  "1": "4px"
  "1.5": "6px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-primary-lg:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "48px"
    width: "100%"
  button-sm:
    rounded: "{rounded.full}"
    padding: "0 14px"
    height: "36px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-muted}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ink}"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-danger-soft:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-success-soft:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "16px"
  card-header:
    backgroundColor: "{colors.surface-muted}"
    typography: "{typography.title-sm}"
    padding: "16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.input}"
    padding: "0 14px"
    height: "44px"
  field-group:
    rounded: "{rounded.group}"
    padding: "16px"
  tabs:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.full}"
    padding: "4px"
  tab-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.full}"
    padding: "0 14px"
    height: "36px"
  tab-counter:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.full}"
    height: "20px"
  segmented:
    backgroundColor: "{colors.surface-sunken}"
    rounded: "{rounded.full}"
    padding: "4px"
  segmented-item-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    height: "36px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "40px"
  chip-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "40px"
  badge-neutral:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "0 10px"
    height: "24px"
  badge-accent:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    rounded: "{rounded.full}"
    padding: "0 10px"
    height: "24px"
  badge-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    rounded: "{rounded.full}"
    padding: "0 10px"
    height: "24px"
  badge-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
    rounded: "{rounded.full}"
    padding: "0 10px"
    height: "24px"
  badge-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    rounded: "{rounded.full}"
    padding: "0 10px"
    height: "24px"
  stat:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.figure}"
    rounded: "{rounded.card}"
    padding: "16px"
  bottom-nav:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "6px"
  bottom-nav-indicator:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.full}"
    height: "28px"
    width: "44px"
  sidebar:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    width: "232px"
  sidebar-item-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.full}"
    padding: "0 14px"
    height: "40px"
  sheet:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.sheet}"
    padding: "20px"
  fab:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "56px"
  next-appointment:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.figure-hero}"
    rounded: "{rounded.panel}"
    padding: "20px"
  timeline-block:
    backgroundColor: "{colors.cat-aplicacao}"
    textColor: "{colors.ink}"
    rounded: "{rounded.block}"
    padding: "8px 12px"
---

# Design System: LashOS

## Overview

**Creative North Star: "O Caderno Clínico"**

O LashOS é um caderno de trabalho limpo: fundo cinza-gelo, cartões brancos que mal se levantam da página e uma única tinta de ação, a berinjela, que marca o que se aperta e o que está selecionado. A calma é a função. Ela abre o app entre uma cliente e outra e em segundos sabe quem vem agora, o que mandar e o que está pendente; nada na tela disputa atenção com isso.

O app de trabalho é neutro e igual para todas as contas. A cor de cada estúdio vale só no link público de agendamento, onde `.accent-scope` recebe o acento e o fundo da profissional e recalcula os tons derivados. Densidade média, pensada para o polegar: uma coluna de até 512px no celular, alvos de 40 a 56px, e no PC um menu lateral branco flutuante, conteúdo central e uma coluna de resumo à direita (a agenda ocupa a largura toda com mini calendário e timeline).

A tipografia é só Inter: títulos em 700 apertados, números tabulares grandes, texto de trabalho em 400 e 600. Os ícones são Hugeicons de traço 1.5. As cores de estado só aparecem onde significam algo, e a agenda ganha três tons calmos por categoria de serviço. Rejeição confirmada no contrato de direção: o "app de beleza rosa com degradê" e o painel genérico de muitas cores.

**Key Characteristics:**
- Fundo cinza-gelo chapado, cartões brancos de 22px com sombra curta, neutra e um fio de 4% de tinta.
- Uma única cor de ação, a berinjela, sempre em pílula: botão principal, aba ativa, chip marcado, item ativo do menu, FAB.
- Inter em tudo; títulos 700 com tracking negativo; números tabulares.
- Ícones Hugeicons de traço 1.5 (1.8 quando ativos na navegação).
- Abas em pílula com contador; controle segmentado num trilho cinza.
- Tons de categoria na agenda (lilás, sálvia, pêssego) e pares tonais de status.
- Assinaturas: o cartão escuro do próximo atendimento e a linha do agora na timeline.

## Colors

Neutros frios quase sem matiz, uma tinta de ação escura e arroxeada, e cor só onde ela informa.

### Primary
- **Berinjela** (`accent`): a única cor de ação do app. Preenche botão principal, FAB, aba ativa, chip marcado, item ativo do menu lateral, indicador da barra inferior, dia selecionado no calendário e o cartão do próximo atendimento. Carrega branco (`accent-ink`) com folga. `accent-strong` é igual à berinjela no app; só difere no link público.
- **Berinjela clara** (`accent-hover`): hover do botão principal, do FAB e do botão do aviso de teste.
- **Véu berinjela** (`accent-soft`): fundo do selo "Confirmado" e do bloco-fantasma "Agendar às" na timeline do PC.
- **Lavanda apagada** (`accent-glow`): reservado; não segura texto.

### Neutral
- **Cinza-gelo** (`background`): o fundo de todas as telas, chapado.
- **Branco** (`surface`): cartões, sheets, campos, barra inferior, menu lateral, abas.
- **Cinza trilho** (`surface-sunken`): trilho do segmentado, contador de aba inativa, selo neutro, hover de ghost e de itens de menu, círculo de ícone do estado vazio.
- **Branco gelo** (`surface-muted`): faixa de título do cartão (`CardHeader`) e hover do botão secundário.
- **Tinta** (`ink`): texto principal e títulos. Também a base de todas as sombras e do fio dos cartões.
- **Tinta suave** (`ink-soft`): subtítulos, descrições, dicas de campo, itens de menu inativos.
- **Tinta clara** (`ink-faint`): rótulos de hora da timeline, placeholders, legendas inativas da barra inferior.
- **Fio** (`line`) e **Fio forte** (`line-strong`): bordas de campo, divisórias, borda do secundário; o forte é hover de borda, alça do sheet e barra de rolagem.

### Status
- **Sucesso** (`success` sobre `success-soft`): concluído, cliente ativa, salvo.
- **Aviso** (`warning` sobre `warning-soft`): pré-agendado, em risco, aviso de período de teste.
- **Perigo** (`danger` sobre `danger-soft`): faltou, cancelamento tardio, inativa, contraindicação, erros, sair da conta (hover) e a linha do agora.

### Agenda
- **Aplicação** (`cat-aplicacao` com fio `cat-aplicacao-line`): lilás.
- **Manutenção** (`cat-manutencao` / `cat-manutencao-line`): sálvia.
- **Lash lifting** (`cat-lifting` / `cat-lifting-line`): pêssego.
- **Outros** (`cat-outro` / `cat-outro-line`): cinza.

### Named Rules
**The One Ink Rule.** No app de trabalho existe uma só cor de ação, a berinjela. O que se aperta ou está selecionado é berinjela com texto branco; todo o resto é neutro. Nada de segundo acento.

**The Studio Color Lives Outside Rule.** A cor e o fundo do estúdio só entram no link público, dentro de `.accent-scope` (que redefine `--accent`, `--bg` e os derivados por `color-mix`). O app logado nunca lê a cor do estúdio.

**The Meaningful Color Rule.** Verde, âmbar e vermelho aparecem só como estado (selos, avisos, erros, a linha do agora); lilás, sálvia e pêssego só como categoria na agenda. Componente nenhum escreve hex; a exceção é marca de terceiros (o azul do Mercado Pago).

## Typography

**Display Font:** Inter (with ui-sans-serif, system-ui, sans-serif)
**Body Font:** Inter, com `cv11` e `ss01` ligados no body

**Character:** uma família só, com contraste feito por peso e tracking: títulos em 700 bem apertados que ancoram a tela, texto de trabalho em 400 e rótulos e botões em 600.

### Hierarchy
- **Display** (700, 28px no celular e 34px no PC, 1.12, -0.035em): título de página (`PageHeader`) e o título do dia na home. Sempre em tinta sólida.
- **Figure hero** (700, 40px, 1, -0.04em, tabular): a hora do cartão do próximo atendimento.
- **Figure** (700, 24px, 1, -0.03em, tabular): números de painel (`Stat`).
- **Title** (700, 18px, -0.02em): título de sheet. **Title-sm** (700, 16px, -0.015em): faixa de título de cartão, títulos de seção e cartões laterais (15 a 17px).
- **Body** (400, 15px, 1.5): campos e texto corrido. **Body-sm** (14px): subtítulos de página e descrições.
- **Button** (600, 14.5px, -0.01em; 13px no pequeno, 15px no grande).
- **Label** (600, 13px, tinta): rótulo de campo, 6px acima dele. **Hint** (12.5px, tinta suave): o que acontece quando se preenche o campo; vira erro em perigo 500.
- **Caption** (600, 12px): selos; contadores de aba em 11px; legenda da barra inferior em 10.5px; horas da timeline em 11.5px 500 tabulares.

### Named Rules
**The One Family Rule.** Só Inter. Hierarquia por peso (400, 600, 700), tamanho e tracking negativo nos títulos; nada de serifa, nada de segunda família.

**The Solid Title Rule.** Títulos são tinta sólida. Sem degradê no texto.

**The Tabular Figures Rule.** Horários, contagens e dinheiro usam números tabulares.

## Layout

- **Celular:** coluna centralizada de até 512px, 16px nas laterais, 20px no topo, e 168px mais a área segura no pé para a barra inferior e o FAB não cobrirem conteúdo.
- **PC (a partir de 1024px):** menu lateral de 256px (painel branco flutuante com 12px de margem, fixo na altura da tela), conteúdo com 40px nas laterais (48px a partir de 1280px) e 36px no topo, em coluna de até 768px (896px a partir de 1280px), e a coluna de resumo de 288px (320px a partir de 1280px) com 32px de vão. A agenda é a exceção: ocupa a largura, esconde a coluna de resumo e coloca mini calendário, segmentado e legenda à esquerda da timeline.
- **Ritmo:** 20px abaixo do cabeçalho de página (28px no PC), 16px entre cartões e dentro deles (20px a partir de 640px), 16px entre campos de um grupo.
- **Toque:** botões e campos de 44px, botão de formulário de 48px em largura total, FAB de 56px; chips, abas e segmentado de 32 a 40px.
- **Sheet:** sobe de baixo no celular; a partir de 640px vira diálogo centralizado de 512px (672px no tamanho grande).
- **Elementos fixos:** barra inferior a 12px das laterais e do pé (ou na área segura); FAB a 96px mais a área segura e 16px da direita, 32px do canto no PC.

## Elevation & Depth

Profundidade mínima e neutra. O fundo é chapado; os cartões brancos se separam dele por uma sombra curta de duas camadas na cor da tinta e um fio de 1px de tinta a 4%. O que flutua sobre o conteúdo (barra inferior, FAB, cartão do próximo atendimento) usa uma sombra um pouco mais longa; sheets usam a mais funda, sobre um véu de tinta a 34%. Sem vidro, sem desfoque, sem sombra colorida.

### Shadow Vocabulary
- **Card** (`box-shadow: 0 1px 2px rgb(23 21 30 / 0.04), 0 8px 24px -14px rgb(23 21 30 / 0.12)`): cartões, stats, abas, menu lateral, faixa da semana, timeline, botão de voltar. Sempre junto do fio `0 0 0 1px rgb(23 21 30 / 0.04)`.
- **Pop** (`box-shadow: 0 2px 6px rgb(23 21 30 / 0.06), 0 16px 36px -16px rgb(23 21 30 / 0.22)`): barra inferior, FAB, cartão do próximo atendimento.
- **Modal** (`box-shadow: 0 24px 64px -20px rgb(23 21 30 / 0.35)`): sheets e diálogos.
- **Botão** (`box-shadow: 0 1px 2px rgb(23 21 30 / 0.14)`): só o botão principal.
- **Segmento ativo** (`box-shadow: 0 1px 2px rgb(23 21 30 / 0.08), 0 2px 8px -3px rgb(23 21 30 / 0.14)`): a opção ativa do segmentado, levantada do trilho.

### Named Rules
**The Short Neutral Shadow Rule.** Toda sombra é feita da tinta (#17151E em baixa opacidade), curta e macia. Nada de sombra tingida pelo acento nem de sombra dura deslocada.

**The No Glass Rule.** Superfícies são brancas e opacas, inclusive a barra inferior e o menu lateral.

## Shapes

Geometria macia de dois registros: tudo que se aperta é pílula; tudo que contém é um retângulo de cantos generosos.

- **Pílula:** botões, abas, chips, segmentado (trilho e opções), selos, contadores, itens do menu lateral, indicador da barra inferior, FAB, botões de ícone.
- **12px:** blocos da timeline e bloqueios, logo/monograma no menu lateral.
- **14px:** campos.
- **18px:** grupo de campos (`FieldGroup`).
- **22px:** cartão base, stat, abas, timeline, faixa da semana.
- **24px:** painéis que flutuam (barra inferior, menu lateral) e o cartão do próximo atendimento.
- **28px:** sheet (cantos de cima no celular, todos a partir de 640px).

Bordas de 1px em Fio; nos cartões, o contorno é o anel de tinta a 4%, não borda. Bloqueios na timeline usam um hachurado de 135° em cinza trilho e branco (7px).

## Components

**Calmos e precisos.** Pílulas firmes, cartões quietos, cada tela dizendo para que serve numa linha.

### Buttons
- **Shape:** pílula em todos os tamanhos.
- **Primary:** berinjela com texto branco, 600 com tracking -0.01em, sombra Botão; 44px de altura e 20px nas laterais. O grande tem 48px e largura total; o pequeno, 36px e 14px nas laterais. Também existe como classes (`buttonClasses`) para links.
- **Hover / Active:** primário vai para Berinjela clara; o toque reduz a escala para 0.98; desabilitado a 45%. Foco por teclado: contorno de 2px da berinjela a 45% no branco, 2px afastado.
- **Secondary:** branco, borda em Fio, texto em tinta; hover com Fio forte e Branco gelo.
- **Ghost:** transparente, tinta suave; hover em Cinza trilho com tinta.
- **Danger / Danger-soft / Success-soft:** vermelho sólido para destruir; pares tonais de perigo e sucesso para ações de cuidado ou de confirmação.

### Tabs
Abas de página num cartão-pílula branco com sombra Card e 4px de respiro. Cada aba é uma pílula de 36px, 13.5px 600; a ativa é berinjela com texto branco. O contador opcional é uma pílula de 20px, 11px tabular: Cinza trilho com tinta suave na inativa, branco a 20% na ativa.

### Segmented
Troca de modo (Dia/Semana/Mês, Já foi paga/Agendar). Trilho em Cinza trilho, pílula, 4px de respiro; opções de largura igual, 36px (32px no pequeno), 600. A ativa é branca, em tinta, com a sombra Segmento ativo. A diferença com as abas é intencional: abas navegam e ficam na berinjela; segmentado troca a vista e fica neutro.

### Chips
Escolha rápida em pílula de 40px (32px no pequeno), 600. Desmarcado: branco, borda em Fio, texto em tinta. Marcado: berinjela cheia com texto branco. Usa `aria-pressed`.

### Badges
Pílula de 24px, 10px nas laterais, 12px 600, em pares tonais. Neutro: cancelado, sem histórico. Berinjela (véu com texto berinjela): confirmado. Sucesso: concluído, ativa. Aviso: pré-agendado, em risco. Perigo: faltou, cancelamento tardio, inativa.

### Cards / Containers
- **Corner Style:** 22px.
- **Background:** branco.
- **Shadow Strategy:** sombra Card mais o anel de tinta a 4%.
- **Border:** nenhuma; divisórias internas em Fio.
- **Internal Padding:** 16px (20px a partir de 640px).
- **CardHeader:** faixa em Branco gelo com fio embaixo: título 16px 700, uma linha de descrição em 13px tinta suave e uma ação à direita.
- **Stat:** cartão com nome em 13px 600, valor em Figure (em sucesso ou perigo quando o número é bom ou ruim) e uma linha explicando o que ele mede.

### Inputs / Fields
- **Style:** 44px, 14px nas laterais, cantos de 14px, borda em Fio, fundo branco, texto de 15px, placeholder em tinta clara. Select com seta de traço; área de texto a partir de 96px.
- **Focus:** borda na berinjela e anel de 3px da berinjela a 10%. Hover: Fio forte.
- **Error / Disabled:** `aria-invalid` deixa a borda em perigo e a dica vira erro (12.5px 500, perigo). Desabilitado a 50%.
- **Field:** rótulo 13px 600 em tinta acima, e uma dica embaixo dizendo o que o campo faz ("Aparece no link que a cliente abre").
- **FieldGroup:** bloco de campos com borda em Fio, cantos de 18px, 16px de respiro, com o nome do grupo como `legend` acessível.

### Navigation
- **Barra inferior (celular):** painel branco de cantos de 24px, sombra Pop e anel de tinta a 6%, seis itens iguais. O ativo leva o ícone dentro de uma pílula escura de 44 por 28px (berinjela, ícone branco, traço 1.8) e a legenda em tinta; inativos em tinta clara, traço 1.5. Legenda em 10.5px 600.
- **Menu lateral (PC):** painel branco flutuante de 24px de canto e sombra Card. No topo, logo ou monograma (quadrado de 40px, cantos de 12px, berinjela com a inicial) com nome do estúdio e da profissional. Itens com ícone e nome, 40px, 14px 600, pílula; o ativo é berinjela com texto branco. Grupos separados por um fio; embaixo, configurações, suporte, copiar link e sair (hover em perigo tonal).
- **Cabeçalho de página:** botão de voltar num círculo branco de 36px com sombra Card, título Display e uma linha de subtítulo de até 62 caracteres dizendo para que a tela serve; ações à direita.
- **Aviso de teste:** faixa em Aviso tonal no topo, com texto em tinta e um botão-pílula pequeno na berinjela.

### Sheet
Sobe de baixo no celular e vira diálogo a partir de 640px. Branco, 28px de canto, sombra Modal, até 88% da altura (92% no modo alto). Cabeçalho com fio embaixo: alça de 40 por 4px (só celular), título 18px 700, descrição de uma linha e fechar num círculo de 36px. O rodapé (`footer`) é fixo fora da rolagem, com fio em cima e respeito à área segura: a ação principal nunca some. Véu de tinta a 34% atrás. Entra em 340ms com `cubic-bezier(0.16, 1, 0.3, 1)`, subindo 24px de escala 0.985, sem quicar. Esc fecha; a página trava a rolagem.

### FAB
Pílula de 56px na berinjela, sinal de mais de 22px e rótulo opcional em 15px 600, sombra Pop; hover em Berinjela clara, toque em 0.95.

### Empty State
Centralizado: ícone num círculo de 44px em Cinza trilho, título 15px 600, uma linha do porquê em 14px tinta suave e o botão que resolve.

### Próximo atendimento (assinatura)
O cartão escuro que é a primeira coisa da home. Berinjela cheia, 24px de canto, 20px de respiro, sombra Pop, texto branco. "Próximo atendimento" em 13px branco a 70% com um selo de tempo opcional (branco a 15%); a hora em Figure hero com "até HH:MM" em branco a 60%; o nome da cliente em 17px 600 (com o alerta de contraindicação num círculo vermelho de 20px); o serviço em branco a 70%. Duas pílulas de 40px: WhatsApp (branco com texto berinjela) e "Ver na agenda" (branco a 12%, 20% no hover).

### Timeline da agenda (assinatura)
Cartão branco de 22px com a grade do dia a 1.6px por minuto, coluna de horas de 52px em 11.5px tabular tinta clara, linhas de hora cheias em Fio e de meia hora tracejadas. Cada atendimento é um bloco de 12px de canto no tom da categoria com o fio da categoria: ponto de status de 6px, horário 12px 600, nome da cliente 14.5px 600 e, se couber, serviço e status. Faltou fica a 60%. Bloqueios são hachurados neutros. No PC, o espaço livre sob o mouse mostra um bloco-fantasma tracejado "Agendar às HH:MM". **A linha do agora** é um ponto de 8px e um fio de 1.5px em perigo atravessando a grade; a timeline abre rolada com o agora a cerca de um quarto da altura.

### Mini calendário e faixa da semana
Mini calendário em cartão (PC): mês em 14 a 16px 700, setas em círculos de 32px, iniciais dos dias em 11.5px 600 tinta clara, dia selecionado num círculo berinjela, pontos de agenda na berinjela a 60-70%. No celular, a faixa da semana é um cartão de 22px com os sete dias e um ponto berinjela a 60% nos dias com horário.

### Icons
Hugeicons (`@hugeicons/react`), traço arredondado 1.5, 20px por padrão (19px no menu lateral, 18px em botões de ícone). Novo ícone: importar o glifo de `@hugeicons/core-free-icons` e embrulhar com `makeIcon` em `icons.tsx`. Na navegação, o ativo sobe para 1.8.

### Motion
Entrada de página só por opacidade (220ms); sheets e destaques do tour sobem com `cubic-bezier(0.16, 1, 0.3, 1)`; tudo desliga com `prefers-reduced-motion`.

## Do's and Don'ts

### Do:
- **Do** usar a berinjela (`bg-accent text-accent-ink`) só para ação e seleção, sempre em pílula.
- **Do** usar o cartão branco de 22px com sombra Card e anel de tinta a 4% como contêiner base sobre o cinza-gelo.
- **Do** abrir cada tela com um título Display e uma linha dizendo para que ela serve, e dar a cada campo uma dica do que acontece.
- **Do** pôr formulários em sheet com a ação principal no rodapé fixo.
- **Do** usar abas em pílula com contador para navegar entre seções e o segmentado no trilho cinza para trocar de vista.
- **Do** usar os tons de categoria só na agenda, sempre com o fio da categoria.
- **Do** usar números tabulares em horários, contagens e dinheiro.
- **Do** desligar animações com `prefers-reduced-motion` e animar a página só por opacidade (transform no contêiner prende FAB, sheet e véu na coluna).

### Don't:
- **Don't** trazer a cor do estúdio para o app logado; ela vive só no link público, em `.accent-scope`.
- **Don't** usar degradê decorativo em botões, cartões, fundos ou texto: o app é chapado. O hachurado dos bloqueios na timeline é textura funcional e continua valendo.
- **Don't** tingir sombras com o acento, nem usar vidro ou desfoque nas superfícies.
- **Don't** usar outra família além da Inter, nem serifa em títulos.
- **Don't** pôr um sobretítulo em caixa alta espaçada acima de títulos; o título e a linha de subtítulo bastam. A caixa alta pequena (11px, 600, tracking 0.08em, `text-ink-faint`) fica só onde ela é o próprio rótulo: o nome de um grupo de campos (`FieldGroup`) e cabeçalhos de tabela, como na referência.
- **Don't** usar verde, âmbar ou vermelho como decoração; eles só dizem estado.
- **Don't** escrever hex em componentes; a exceção é marca de terceiros (o azul do Mercado Pago).
- **Don't** usar a escala cinza do Tailwind (`gray`, `zinc`, `slate`, `stone`, `neutral`); os neutros vêm dos tokens.
