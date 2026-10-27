---
target: Assinatura
total_score: 18
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\Lucas\\agents-workspace\\projetos\\lash-studio\\src\\app\\assinatura\\page.tsx"
target_fingerprint: "sha256:478d3e03cbb3bf8bbad3087de1b3cd2433a0aa33fe7bb3764b50a177c060e6a6"
target_path: "C:\\Users\\Lucas\\agents-workspace\\projetos\\lash-studio\\src\\app\\assinatura\\page.tsx"
timestamp: 2026-10-23T13-50-57Z
slug: src-app-assinatura-page-tsx
---
Method: dual-agent (A: quatro subagentes isolados, um por tela · B: um subagente com o detector e o overlay)

# Critique do LashOS: Meu dia, agenda, link público e assinatura

Avaliado em localhost, com o banco de dev, em 23/10/2026. A conta de teste usa o tema do seed (fundo champagne e acento dourado). As revisões também aplicaram o Pink de referência na própria aba para comparar. Nenhuma avaliação enviou formulário nem alterou dados.

## Placar

| Tela | Nota | Faixa | P0 | P1 | Carga cognitiva |
|---|---|---|---|---|---|
| Meu dia | 22/40 | Aceitável | 0 | 2 | alta (4 de 8 falhas) |
| Agenda | 24/40 | Aceitável | 1 | 2 | moderada (3 de 8) |
| Link público | 26/40 | Aceitável | 0 | 2 | moderada (3 de 8) |
| Assinatura | 18/40 | Ruim | 0 | 3 | moderada (3 de 8) |

## O que vale para o app inteiro

Os problemas mais graves não pertencem a uma tela só. Eles estão no kit de componentes e no CSS global, e por isso apareceram em várias revisões.

1. **[P0] No celular, a pílula de navegação fica por cima de todos os sheets.**
   - **Causa:** a animação de entrada de página (`.page-in`, com `animation-fill-mode: both` em `globals.css:124-126`) cria uma camada própria. Essa camada prende o `z-50` do Sheet abaixo do `z-40` da pílula.
   - **Conferido em 375×812:** os botões "Reagendar", "Faltou" e "Cancelar horário" do detalhe do horário recebem o toque na pílula. A revisão da agenda mediu o mesmo no "Agendar 16:00 · R$ 110,00": o toque abre a fila de mensagens e o formulário some.
   - **Correção:** renderizar o Sheet num portal no `body` e trocar `both` por `backwards`.
   - **Comando:** `/impeccable harden`.
2. **[P1] Os destaques de cor não aparecem.**
   - **Causa:** o `cn` (`src/lib/cn.ts`) só junta as classes, sem resolver conflitos do Tailwind, e a classe base do componente vence.
   - **Conferido no navegador:** o cartão do próximo atendimento sai branco e o selo "Agora" sai na cor neutra.
   - **Também sem cor:** o painel vermelho de contraindicação no perfil da cliente, a anamnese e o "Complete seu perfil".
   - **Correção:** `tailwind-merge` no `cn`, ou variantes explícitas (`Card` de destaque e de perigo, `Badge` sólido).
   - **Comando:** `/impeccable harden`.
3. **[P1] A contraindicação é o aviso mais importante e o menos legível.**
   - **Na home e na agenda:** é um triângulo de 14 a 15px, sem texto.
   - **No alerta do agendamento:** aparece o código cru "ALERGIA_CIANOACRILATO · GLAUCOMA_COLIRIO" (`contra-alert.tsx:13`), embora os rótulos em português já existam em `clientes/contraindications.ts`.
   - **Na visão de mês:** o ícone some quando o nome é truncado.
   - **No perfil:** o painel sai branco, pelo problema do item 2.
   - **Comando:** `/impeccable clarify`.
4. **[P2] As cores de texto não seguem o estúdio, e o tom mais fraco carrega informação.**
   - **Cores fixas:** Ameixa escura, Malva e Rosa poeira são fixas (`globals.css:12-14`), então num estúdio dourado o texto fica rosado.
   - **Rosa poeira (#C795AB) em texto que importa, com contraste entre 2,1 e 2,5:1:**
     - legendas da navegação, em 10px;
     - eixo de horas da agenda e "Almoço · 12:00–13:00";
     - passos e títulos de categoria do link público;
     - "Sair da conta" e os sobretítulos do painel do PC.
   - **Texto branco sobre a ponta clara do degradê:** botão "Assinar" a 2,7:1, rótulo do FAB a 3,2:1, legenda do cartão de nível a 2,4:1.
   - **Temas quentes:** em acentos dourados ou terracota, "Pré-agendado" (âmbar) e "Confirmado" (acento) ficam quase da mesma cor.
   - **Comando:** `/impeccable colorize`.
5. **[P2] Não há proteção para erro, foco e zoom.**
   - Não existe `error.tsx`: uma falha de banco mostra a tela padrão do Next, em inglês.
   - Nenhum componente tem estilo de foco próprio.
   - O `maximumScale: 1` do `layout.tsx` bloqueia o zoom.
   - **Comandos:** `/impeccable harden` e `/impeccable audit`.
6. **Regressão: a vitrine de fotos sumiu.** O commit `afa2e23` (Mercado Pago por OAuth) tirou a galeria do link público e o botão de marcar foto da ficha técnica, e a mensagem do commit não cita isso. Corrigi o PRODUCT.md, que dizia que a vitrine estava no ar, e o trecho do DESIGN.md que dizia que as cores de texto seguiam o estúdio.

---

## Assinatura: 18/40 (Ruim)

| # | Heurística | Nota | Problema-chave |
|---|---|---|---|
| 1 | Visibilidade do status | 2 | A volta do checkout pede "Atualize a página", o que não é possível no app instalado. "Assinatura confirmada!" depende só do `?volta=1` (apareceu na conta Cortesia, que nunca pagou). O fim do teste nunca aparece. |
| 2 | Sistema e mundo real | 3 | O pt-BR é natural, mas "Plano mensal … /mês" se repete e "Gerencie sua assinatura abaixo" aparece sem nada para gerenciar. |
| 3 | Controle e liberdade | 1 | A tela promete "cancele quando quiser", mas não existe cancelar, trocar o cartão nem ver a próxima cobrança. Bloqueada, ela só pode pagar ou sair. |
| 4 | Consistência | 2 | "Situação: Ativa · até 15/10" aparece sob "Sua assinatura venceu". Usa emoji em vez dos ícones do kit. "Voltar" e "Sair" têm 20px de altura. |
| 5 | Prevenção de erros | 1 | O botão de pagar aparece em todos os estados, e cada toque cria uma assinatura nova no Mercado Pago. Não há aviso antes do fim do teste. |
| 6 | Reconhecer em vez de lembrar | 2 | Faltam a data de fim do teste, a da primeira e a da próxima cobrança, e onde cancelar. |
| 7 | Flexibilidade | 1 | Só aceita cartão. Não dá para assinar antes do teste acabar, nem trocar o cartão de uma mensalidade recusada. |
| 8 | Estética e minimalismo | 3 | O cartão é limpo e tem uma ação só. O ruído vem dos três emoji e do parágrafo de 5 linhas. |
| 9 | Recuperação de erros | 2 | "Fale com o suporte" não traz contato. Uma mensalidade recusada vira só "Sua assinatura venceu". |
| 10 | Ajuda | 1 | Não há contato da ONOS nem explicação da cobrança além da letra miúda, com contraste de 2,5:1. |
| | **Total** | **18/40** | **Ruim** |

**Especificidade de design**
- **Revisão:** é o paywall padrão de SaaS (emoji grande, título, quadro de valor, botão, letra miúda e link de sair). Trocando o nome, serviria a qualquer produto. O que é do LashOS vem de fora (cor do estúdio, Fraunces, sombra Pop) e de uma frase certa: "clientes, agenda, fotos e financeiro voltam exatamente como deixou". Faltam a identidade do estúdio, os números reais da conta, o dia de hoje e o WhatsApp.
- **Detector:** o CLI não achou nada.
- **Overlay:** achou o que a revisão não tinha pegado:
  - o texto branco do botão "Assinar com cartão de crédito" a 2,7:1 sobre o degradê;
  - a letra miúda a 2,5:1;
  - "Sair da conta" a 2,1:1;
  - "quiser." sozinho na última linha.

**Impressão geral:** a tela responde o medo certo (os dados), deixa sem resposta o outro (o cartão) e tem falhas na lógica de cobrança que podem custar dinheiro de verdade. A maior oportunidade é avisar antes de bloquear e, já bloqueada, deixar ver o dia de hoje.

**O que funciona**
- O texto sobre os dados responde o medo certo, com as palavras do ofício. E um status desconhecido nunca bloqueia (`subscription.ts:27`).
- A tela mantém a cara do estúdio mesmo fora do app.
- Há uma ação só, com estado de carregando que evita o toque duplo na mesma requisição.

**Problemas prioritários**
- **[P1] O botão de pagar aparece em todos os estados, e a mensagem de status não vem do pagamento: risco de cobrança em dobro e de confirmação falsa.**
  - **O quê (conferido no código):**
    - O `AssinarForm` é sempre renderizado.
    - A mensagem é escolhida pelo `?volta=1` e por `bloqueada`.
    - Cada toque cria um preapproval novo (`mp-subscription.ts:28-58`).
    - O webhook encontra a conta também pela `external_reference`, então duas adesões concluídas geram duas cobranças.
  - **Correção:**
    - Estados explícitos, derivados do status e das datas, nunca da URL.
    - "Aguardando confirmação" sem botão de pagar e com verificação automática.
    - No servidor, reaproveitar o preapproval pendente.
  - **Comando:** `/impeccable harden`.
- **[P1] O bloqueio chega sem aviso e não deixa ver o dia já marcado.**
  - **O quê:**
    - A data de fim do teste nunca aparece para ela, e não há link para a tela em lugar nenhum do app.
    - O teste termina na hora exata da criação da conta, sem a tolerância que a assinatura ativa tem.
    - Bloqueada, ela não vê nem a próxima cliente.
    - Enquanto isso, o push diário e o WhatsApp automático continuam saindo (conferido no cron).
  - **Correção:**
    - Aviso 3 dias antes no Meu dia e na sidebar.
    - Teste valendo até 23:59 no fuso dela.
    - Um bloco "Hoje", só de leitura, na tela bloqueada.
  - **Comando:** `/impeccable shape`.
- **[P1] O quadro de cobrança não responde quanto, quando e como sair.**
  - **O quê:**
    - "Renova todo mês automaticamente — cancele quando quiser" está em 12px, com contraste de 2,5:1.
    - A primeira cobrança acontece na adesão, e a tela não mostra a data das próximas.
    - Cancelar não existe, e o webhook ignora pausa e cancelamento.
    - A linha "Situação" contradiz o título.
  - **Correção:**
    - Reescrever o quadro: "Primeira cobrança: hoje, no cartão · Próximas: todo dia 23".
    - Mostrar a situação real.
    - Criar "Cancelar assinatura". Até ele existir, mostrar "Para cancelar, fale com a ONOS".
  - **Comando:** `/impeccable clarify`.
- **[P2] Não há como falar com uma pessoa numa tela que bloqueia o app inteiro.**
  - **O quê:**
    - "Fale com o suporte" não traz contato.
    - A conta suspensa não diz o motivo e mostra o mesmo botão de pagar. Pagar reativa a conta, passando por cima da suspensão manual.
    - Quem não tem cartão não vê o caminho real, que é a ONOS liberar mais 30 dias.
  - **Correção:** botão "Falar com a ONOS no WhatsApp" em todo estado bloqueado.
  - **Comando:** `/impeccable harden`.
- **[P2] Acabamento.**
  - **O quê:**
    - O rótulo do botão quebra em duas linhas a 375px.
    - Emoji no lugar de ícone: cadeado, coração no título e cartão no botão, este último lido pelo leitor de tela.
    - "Voltar" e "Sair" têm 20px de altura.
  - **Comando:** `/impeccable polish`.

**Sinais por persona**
- **Duda, com o teste encerrado no meio do dia:**
  - Abre o app para ver a próxima cliente e não acha nenhum atendimento de hoje, depois de o push da manhã ter mostrado a agenda.
  - Nunca viu a data de fim do teste.
  - Depois de pagar, o cadeado continua, e a única ação é pagar de novo.
  - Quer falar com a ONOS e não há contato.
- **Casey, celular numa mão só:**
  - Volta do Mercado Pago dentro do app instalado e lê "Atualize a página", sem botão para isso e sem o gesto de puxar para atualizar.
  - Se é interrompida e reabre o app, cai na tela bloqueada sem sinal de que já começou a assinar.
- **Riley, testando limites:**
  - Abre `/assinatura?volta=1` sem pagar e recebe "Assinatura confirmada!".
  - Toca "Assinar" duas vezes e gera dois preapprovals.
  - Uma conta criada com R$ 0,00 mostra "R$ 0,00/mês".

**Observações menores**
- O título usa 24px sem degradê, fora da escala do DESIGN.md.
- No estado bloqueado, o parágrafo centralizado ocupa 5 linhas.
- No PC, o cartão de 384px fica sozinho no meio da tela.
- A tela não diz o que continua funcionando durante o bloqueio: o link público, o push e o WhatsApp automático.

**Perguntas**
- E se o bloqueio travasse só criar e editar, deixando o Meu dia em modo leitura?
- Por que a primeira notícia do fim do teste é um cadeado?
- Num produto feito em volta do Pix e do WhatsApp, por que a mensalidade só aceita cartão e a ajuda não tem WhatsApp?
