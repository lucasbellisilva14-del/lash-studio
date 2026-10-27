---
target: Agenda
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:C:\\Users\\Lucas\\agents-workspace\\projetos\\lash-studio\\src\\app\\(app)\\agenda\\page.tsx"
target_fingerprint: "sha256:87e93a78242409a22a8f65e52ff2e47cb77c52ad19f065e6193e3c701de4f803"
target_path: "C:\\Users\\Lucas\\agents-workspace\\projetos\\lash-studio\\src\\app\\(app)\\agenda\\page.tsx"
timestamp: 2026-10-23T13-50-56Z
slug: src-app-app-agenda-page-tsx
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

## Agenda: 24/40 (Aceitável)

| # | Heurística | Nota | Problema-chave |
|---|---|---|---|
| 1 | Visibilidade do status | 2 | "Sinal recebido", falta e cancelamento só fecham o sheet. Criar um horário só navega. Na semana, o status é um ponto de 8px. |
| 2 | Sistema e mundo real | 3 | O vocabulário é fluente, mas o alerta crítico aparece em código cru e as datas saem como "Sexta-Feira, 23 De Outubro". |
| 3 | Controle e liberdade | 2 | Concluir e "Sinal recebido" não têm desfazer. "Desfazer cancelamento" nunca aparece. Um toque no véu ou o Esc descarta o formulário de 3 etapas sem perguntar. |
| 4 | Consistência | 3 | O mesmo atendimento aparece de três jeitos nas três visões. O texto alterna "agendamento" e "atendimento". |
| 5 | Prevenção de erros | 2 | As regras do ofício previnem bem, mas "Concluir" é o botão principal num horário futuro, e no celular o botão de enviar fica sob a pílula. |
| 6 | Reconhecer em vez de lembrar | 2 | Bloqueios e lista de espera são só ícones. O toque no vão não tem pista visual. A semana não tem legenda das cores. |
| 7 | Flexibilidade | 2 | Há bons atalhos do domínio. Faltam deslizar entre dias, atalhos de teclado no PC e "próximo horário livre" em vários dias. |
| 8 | Estética e minimalismo | 3 | A tela é calma. O sheet de detalhe empilha 6 botões de peso parecido, e a semana gasta a primeira tela com dias passados. |
| 9 | Recuperação de erros | 2 | As mensagens dizem o problema e preservam o formulário, mas não sugerem saída (próximo horário livre, encaixar mesmo assim). |
| 10 | Ajuda | 3 | Há boa ajuda nos momentos de risco (falta, cancelamento tardio, sinal, ciclo). Não há legenda das cores. |
| | **Total** | **24/40** | **Aceitável** |

**Especificidade de design**
- **Revisão:** o esqueleto é o de qualquer agenda (Dia/Semana/Mês, linha do tempo, FAB, sheet), mas as regras do ofício entram no fluxo de criação na hora certa:
  - os horários livres já respeitam o respiro e os bloqueios;
  - a manutenção fora do prazo oferece troca para aplicação em um toque;
  - o sinal aparece com valor e motivo antes de salvar;
  - a manutenção pode ser marcada junto, dentro do ciclo.

  Nenhum app genérico faz isso. Mas o ciclo não aparece em nenhuma das três visões, e nenhuma responde "onde cabe mais uma cliente?".
- **Detector:** nenhum achado principal e 1 aviso verdadeiro: o selo de contagem de 10px na grade do mês (`month-grid.tsx:75`).
- **Overlay:**
  - Achou o eixo de horas e o rótulo "Almoço" com contraste entre 2,3 e 2,5:1.
  - Achou o "Agendar" do FAB em branco sobre o degradê (3,2:1), que a revisão não tinha pegado.
  - Marcou o hachurado do bloqueio como listra decorativa. É falso positivo: é a convenção de horário bloqueado.

**Impressão geral:** as regras trabalham bem na criação, mas no celular o fim de cada sheet trava (o P0), e o detalhe põe ações sem volta no mesmo peso das seguras. A maior oportunidade é mostrar vagas em vez de marcações.

**O que funciona**
- As regras aparecem na hora da decisão, e o botão final resume tudo ("Agendar 16:00 · R$ 110,00").
- O texto de consequência é bem escrito: "Marcar falta registra +1… a partir de 2 faltas, sinal passa a ser exigido" e "Desfazer falta (marquei errado)". Depois de cancelar, a lista de espera aparece com a mensagem pronta.
- A linha do tempo do dia é bem feita: bloqueio hachurado, cor por categoria, linha do agora e rolagem automática até o horário atual.

**Problemas prioritários**
- **[P0] Os sheets ficam sob a pílula no celular** (item 1 do app inteiro).
  - **Por que importa:** pelo celular, ela não consegue agendar, marcar falta nem cancelar.
  - **Comando:** `/impeccable harden`.
- **[P1] A contraindicação fica ilegível ou some** (item 3 do app inteiro).
  - **O quê:** código cru no alerta do agendamento, ícone cortado na visão de mês e nenhum texto para o leitor de tela.
  - **Comando:** `/impeccable clarify`.
- **[P1] Ações sem volta e sem proteção, num bloco de botões grande demais.**
  - **O quê:**
    - "Concluir atendimento" é o botão principal mesmo antes do horário, sem confirmação. A reversão só aceita falta e cancelamento (`actions.ts:573`).
    - "Sinal recebido" lança uma receita sem confirmar e sem desfazer.
    - "Desfazer cancelamento" nunca aparece, porque a agenda não carrega horários cancelados (`data.ts:134`).
    - Um horário pré-agendado mostra 6 ou 7 botões de peso parecido.
  - **Correção:**
    - A ação principal muda conforme o momento.
    - Concluir antes do horário pede confirmação.
    - Um toast com "Desfazer" fica 5 segundos na tela.
    - "Faltou" e "Cancelar" vão para "Mais ações".
  - **Comando:** `/impeccable distill`.
- **[P2] O status depende só da cor, e a cor se confunde nos temas.**
  - **O quê:** no champagne, "Pré-agendado" e "Confirmado" ficam a 1,45:1 entre si. Na semana, o status é um ponto de 8px, e no mês todos os pontos usam o acento.
  - **Comando:** `/impeccable colorize`.
- **[P2] A agenda não responde "onde cabe mais uma?".**
  - **O quê:**
    - A semana começa no domingo, então numa sexta a tela abre com quatro dias passados vazios.
    - O mês não diferencia dia fechado, lotado ou com vaga.
    - O toque no vão não tem pista visual.
    - Não há "encaixar mesmo assim".
  - **Comando:** `/impeccable shape`.

**Sinais por persona**
- **Duda, encaixando clientes:**
  - Tenta encaixar a Patrícia às 16:00 e cai na fila de mensagens sem agendar.
  - Lê "ALERGIA_CIANOACRILATO" enquanto prepara a cola.
  - Não pode furar o próprio respiro de 15 minutos.
  - Depois de agendar com sinal, não tem "Mandar Pix no WhatsApp".
- **Casey, celular numa mão só:** um toque no véu fecha as 3 etapas sem perguntar, e reabrir apaga tudo. "Hoje", Bloqueios e Lista de espera ficam no topo, e não dá para deslizar entre dias.
- **Sam, leitor de tela:**
  - O sheet não tem nome acessível e não prende o foco.
  - Criar pelo vão é uma `div` clicável, sem acesso pelo teclado.
  - O interruptor da manutenção não tem `role="switch"`.

**Observações menores**
- A classe `capitalize` gera "Sexta-Feira, 23 De Outubro".
- A linha do agora risca o texto do cartão.
- O skeleton mostra uma faixa de 7 dias que a tela não tem.
- O sucesso aparece em âmbar, a cor de aviso.
- A lista de espera vazia promete "o LashOS avisa quem está esperando", mas nada é enviado sozinho.
- Um horário com falta não ocupa espaço, então dois cartões podem se sobrepor na linha do tempo.

**Perguntas**
- E se o Dia abrisse em "agora e a seguir"?
- E se Semana e Mês mostrassem vagas em vez de marcações?
- Se ela é a dona das regras, por que não pode furar o próprio respiro com uma confirmação?
