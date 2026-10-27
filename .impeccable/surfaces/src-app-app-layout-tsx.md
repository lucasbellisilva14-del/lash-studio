---
version: 1
slug: "src-app-app-layout-tsx"
primary_target: "src/app/(app)/layout.tsx"
related_targets: ["src/app/(app)/page.tsx","src/app/(app)/agenda/page.tsx"]
---

# App de trabalho do LashOS (área logada)

Modo: Operate. Quem usa: a lash designer autônoma, no celular entre uma cliente e outra e no PC à noite. Tarefa: ver o dia, agendar, mandar a fila, registrar ficha e dinheiro, sem atrito.

Restrições: app neutro para todas as contas (a cor do estúdio vale só no link público /agendar); menu do PC com ícone e nome; publicar só depois de Lucas aprovar prints de celular e PC.

## Direction contract

THESIS: Calma clínica. O app vira um caderno limpo de trabalho: cinza-gelo, cartões brancos e uma única tinta de ação. Recusa o "app de beleza rosa com degradê" e o painel genérico de muitas cores.

OWN-WORLD: fundo #F3F3F6, cartões brancos de 22px com sombra curta e macia, tinta #17151E, ação e seleção em berinjela #2A2240 (pílula), Inter em todos os textos com títulos 700 e tracking -0.035em, ícones Hugeicons de traço 1.5, abas pílula com contador, segmentado com trilho cinza, cores de estado só onde significam algo e tons calmos por categoria na agenda (lilás, sálvia, pêssego).

STORY: ela abre o app e em segundos sabe quem vem agora, o que mandar e o que está pendente; cada tela diz para que serve numa linha e cada campo diz o que acontece.

FIRST VIEWPORT: celular — título do dia grande, subtítulo com a saudação, cartão escuro do próximo atendimento, atalhos e a agenda de hoje; barra inferior branca com indicador escuro no item ativo. PC — menu lateral branco flutuante com ícone e nome, conteúdo central, coluna de resumo à direita (exceto na agenda, que ocupa a largura com mini calendário + timeline).

FORM: direção fixada pelo pedido do usuário (referência visual da Cliniu, "copie tudo"); o sorteio rodou (concept-seed --scope direction --mode operate) e a direção fixada pelo usuário prevalece sobre ele, como manda a skill. seed:15c19b0671531aa9. Movimento-assinatura: o cartão escuro do "próximo atendimento" e a timeline da agenda com blocos tingidos por categoria e a linha do agora.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
