---
target: Link público de agendamento
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\Lucas\\agents-workspace\\projetos\\lash-studio\\src\\app\\agendar\\[slug]\\page.tsx"
target_fingerprint: "sha256:69facb644fea25fcdfcd5882528e39ae7d1fdbf511bdd967e784e3d8373a4cdb"
target_path: "C:\\Users\\Lucas\\agents-workspace\\projetos\\lash-studio\\src\\app\\agendar\\[slug]\\page.tsx"
timestamp: 2026-10-23T13-50-57Z
slug: src-app-agendar-slug-page-tsx
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

## Link público: 26/40 (Aceitável)

| # | Heurística | Nota | Problema-chave |
|---|---|---|---|
| 1 | Visibilidade do status | 3 | Indicador de etapas, barra fixa com resumo, "Enviando…" e "Código copiado!" funcionam. Depois do envio, não diz se o horário está segurado nem por quanto tempo. |
| 2 | Sistema e mundo real | 3 | "Confirmar" só cria um pedido. "150 min" seria "2h30". "Exige sinal" aparece sem o valor. |
| 3 | Controle e liberdade | 2 | "Trocar" é um alvo de 44×20px. Nenhuma etapa entra no histórico: o voltar do celular sai da página e apaga tudo. |
| 4 | Consistência | 3 | Segue o DESIGN.md. Os chips não têm `aria-pressed`, e o fluxo mistura "Confirmar", "Solicitação enviada" e "o estúdio confirma". |
| 5 | Prevenção de erros | 2 | "Manutenção" fica aberta a quem nunca fez aplicação. A cliente se compromete sem saber o valor do sinal nem a regra de desmarcar. "Hoje" vem marcado mesmo sem vaga. |
| 6 | Reconhecer em vez de lembrar | 3 | A barra fixa mantém as escolhas à vista. Os dias não mostram se têm vaga. |
| 7 | Flexibilidade | 2 | Faltam link direto para um serviço, lembrar quem volta e pular para o próximo dia com vaga. No PC, 6 dos 12 dias ficam escondidos. |
| 8 | Estética e minimalismo | 3 | É limpo, mas o cabeçalho de cerca de 330px se repete nas 3 etapas. |
| 9 | Recuperação de erros | 3 | Os erros têm saída pelo WhatsApp, mas aparecem longe do campo e sob o teclado. Token vencido manda recarregar e apaga tudo. |
| 10 | Ajuda | 2 | Não responde quanto é o sinal, se ele é descontado, até quando pagar nem qual é a regra de desmarcar. |
| | **Total** | **26/40** | **Aceitável** |

**Especificidade de design**
- **Revisão:** é competente, mas genérico. É o molde de qualquer agendador e serviria a uma barbearia sem mudar nada. O que é do produto está na moldura (cor, monograma e nome do estúdio, "feito com LashOS" só no rodapé) e no fim (Pix copia e cola com valor travado). Falta o ofício: antes e depois, técnicas, regra da manutenção.
- **Detector:** nenhum achado principal e 3 avisos de cor na imagem de prévia do link (#FFFDF8, #33261A, #6E5E45). O hex fixo é inevitável numa imagem gerada, mas os tons saem da paleta do sistema: esse desvio é real.
- **Overlay:**
  - Achou o Rosa poeira entre 2,1 e 2,3:1 nos passos inativos, nos títulos de categoria ("APLICAÇÃO", "MANUTENÇÃO") e no rodapé.
  - Marcou o sobretítulo "Agendamento online", que o DESIGN.md prevê.

**Impressão geral:** o meio do fluxo é o melhor trecho do app: serviço, dia já marcado, um toque no horário e os dados. Mas o dinheiro aparece tarde e o fim não fecha o ciclo. A maior oportunidade é mostrar o sinal e a regra de desmarcar antes do compromisso e terminar em "Falta só o sinal".

**O que funciona**
- A barra fixa com resumo e "Trocar" fica na zona do polegar, no padrão de app de entrega que a cliente já conhece.
- A velocidade é honesta:
  - o dia vem pré-selecionado;
  - o toque no horário já avança;
  - nome e telefone têm autocomplete;
  - num conflito, ela volta à etapa 2 com os dados preservados.
- A página é do estúdio, não do app.

**Problemas prioritários**
- **[P1] O momento do dinheiro não responde o que a cliente precisa saber.**
  - **O quê:**
    - "Exige sinal" aparece sem o valor (`booking-flow.tsx:246`).
    - A regra de desmarcar (24h) não aparece em lugar nenhum da página.
    - "Confirmar" cria só um pedido pré-agendado.
    - A tela final abre com um check verde enquanto o horário ainda depende do sinal.
    - "Envie o comprovante" está em 12px, em Rosa poeira.
    - Com o Mercado Pago conectado, a tela ainda pede comprovante.
  - **Correção:**
    - Valor do sinal já no cartão do serviço.
    - Um bloco "Como funciona" com a regra de desmarcar.
    - Botão "Continuar para o Pix".
    - Tela final "Falta só o sinal".
  - **Comando:** `/impeccable clarify`.
- **[P1] O fluxo não sobrevive ao vai e vem do celular.**
  - **O quê:** tudo vive na memória da página. Se a aba recarregar na ida ao app do banco, o código Pix some e a página volta ao passo 1.
  - **Correção:**
    - As etapas entram na URL.
    - Uma página do pedido reabre o Pix e o status.
    - Um rascunho fica no `sessionStorage`.
    - O token anti-spam é renovado sem pedir recarga.
  - **Comando:** `/impeccable harden`.
- **[P2] A vitrine está desligada (regressão do `afa2e23`) e a página não mostra o ofício.**
  - **O quê:** não há antes e depois nem descrição das técnicas.
  - **Comando:** `/impeccable shape`.
- **[P2] A identidade do estúdio vaza para o rosa do LashOS.**
  - **O quê:**
    - As cores de texto são fixas (item 4 do app inteiro).
    - O `themeColor` fixo #FFD0E3 pinta a barra do navegador de rosa.
    - A imagem de prévia não usa Fraunces, e o último ponto do degradê é translúcido, o que vira uma diagonal suja no WhatsApp em modo escuro.
    - O `loading.tsx` usa um creme fixo.
  - **Comando:** `/impeccable colorize`.
- **[P2] Legibilidade e acessibilidade falham onde a decisão acontece.**
  - **O quê:**
    - "Nenhum horário livre nesse dia" e a regra das 2h estão em Rosa poeira.
    - Dias e horários não têm `aria-pressed`.
    - O foco se perde ao trocar de etapa.
    - Os erros não têm `role="alert"` e ficam sob o teclado.
    - O zoom está bloqueado.
  - **Comando:** `/impeccable audit`.

**Sinais por persona**
- **Carol, cliente vinda do WhatsApp:**
  - Só descobre o valor do sinal (R$ 48,00) depois de entregar nome e WhatsApp.
  - Não acha a regra de desmarcar.
  - Vê o check verde e precisa rolar para descobrir que ainda deve um Pix.
  - Lê "Seus dados serão usados só para este agendamento", o que não é verdade: ela vira cadastro e entra nas mensagens de resgate. Isso fere o princípio "Só fato verdadeiro" e a LGPD.
- **Casey, celular numa mão só:**
  - Usa o voltar do Android na etapa 3 e perde tudo.
  - Copia o Pix, vai ao banco e, se a aba recarregou, volta ao passo 1.
  - A barra fixa corta o preço em "R$ 160,…".
- **Riley, testando limites:**
  - Uma cliente nova marca "Manutenção — Clássico" (R$ 90) sem nenhuma regra.
  - Às 18h, a página abre em "hoje", sem horário.
  - Com a aba aberta até o dia seguinte, o envio pede "Recarregue a página".

**Observações menores**
- A grade de horários não separa manhã e tarde.
- No PC, a faixa de dias esconde metade das datas sem indicar a rolagem.
- O limite anti-spam aparece como "agenda online está cheia".
- O DDD 48 está fixo no exemplo de telefone.
- A tela final não mostra o endereço.
- A prévia do link promete "em 1 minuto ✨".

**Perguntas**
- Se o sinal e a regra de desmarcar aparecessem no cartão do serviço, a cliente confiaria mais ou desistiria antes?
- Com o Mercado Pago conectado, por que a última tela não termina em "Horário confirmado"?
- O que esta página teria que só um estúdio de cílios teria?
