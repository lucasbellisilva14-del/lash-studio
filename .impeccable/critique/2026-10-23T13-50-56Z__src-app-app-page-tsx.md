---
target: Meu dia
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\Lucas\\agents-workspace\\projetos\\lash-studio\\src\\app\\(app)\\page.tsx"
target_fingerprint: "sha256:3aa83886c419e12beca200b0d2844912ac2be88dd7156acf138afa82b54b0cb0"
target_path: "C:\\Users\\Lucas\\agents-workspace\\projetos\\lash-studio\\src\\app\\(app)\\page.tsx"
timestamp: 2026-10-23T13-50-56Z
slug: src-app-app-page-tsx
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

## Meu dia: 22/40 (Aceitável)

| # | Heurística | Nota | Problema-chave |
|---|---|---|---|
| 1 | Visibilidade do status | 2 | O destaque do próximo atendimento não aparece. "Agora / Em N min" fica parado até atualizar a página. |
| 2 | Sistema e mundo real | 3 | A linguagem do ofício é forte. No vazio da agenda, "fila" significa lista de espera. "12 par em estoque" está sem plural. |
| 3 | Controle e liberdade | 3 | Nada prende a usuária. O menu do FAB não fecha com Esc. |
| 4 | Consistência | 2 | A fila tem 4 nomes ("Fila", "Mensagens", "Abrir fila", "Abrir fila de mensagens"). O texto fica rosado no estúdio dourado. |
| 5 | Prevenção de erros | 2 | A cliente na maca tem alergia à cola, e a home mostra só um triângulo de 15px. |
| 6 | Reconhecer em vez de lembrar | 3 | A linha leva ao dia, não ao horário. O truncamento esconde a técnica e o nome. |
| 7 | Flexibilidade | 2 | A home só mostra: daqui não dá para concluir, confirmar sinal nem enviar mensagem. |
| 8 | Estética e minimalismo | 2 | Nível e faturamento vêm antes das pendências. No PC, o painel lateral repete a home. |
| 9 | Recuperação de erros | 1 | Sem `error.tsx`: uma falha cai na tela padrão do Next. |
| 10 | Ajuda | 2 | Os alertas explicam a regra. Não há suporte nem explicação do XP. |
| | **Total** | **22/40** | **Aceitável** |

**Especificidade de design**
- **Revisão:** o conteúdo é do ofício ("dia 15 do ciclo · manutenção vale até o dia 21"). O esqueleto, porém, é o de qualquer home de app: saudação, quatro atalhos, faixa de gamificação, seções com "Ver agenda" e FAB. "A Penteadeira" não aparece no espaço. Não existe um lugar para o "agora", e o ciclo, diferencial nº 1, é uma linha de texto na quarta seção.
- **Detector:** nenhum achado principal. Os 2 avisos de tamanho de fonte (27px na saudação e 17px nos títulos de seção) são falsos positivos: esses tamanhos estão no texto do DESIGN.md, e o detector só lê o frontmatter.
- **Overlay:** confirmou os contrastes baixos que a revisão viu:
  - horário de término, "+ 1 outra" e o nome do estúdio sob a saudação (2,1:1);
  - legendas da navegação em 10px, a 2,5:1.

  Também marcou o título em degradê, que é assinatura intencional (falso positivo).
- **Onde ver:** os overlays estão na aba **[Human] Meu dia** do navegador embutido, no tamanho de PC, com 16 marcações. O painel está oculto: use Ctrl+Shift+B e escolha a aba. O overlay continua lá até a aba ser recarregada.

**Impressão geral:** a tela é bonita e calorosa no topo, mas está organizada para o PC, não para os 2 minutos entre uma cliente e outra. No celular, a fila de mensagens começa atrás da pílula e os alertas só aparecem na segunda tela, depois do XP e do faturamento. A maior oportunidade é um bloco "agora" com a cliente da maca, a contraindicação escrita e a próxima ação.

**O que funciona**
- Os alertas fazem a conta do ofício por ela: regra, prazo e consequência numa linha, com destino no toque.
- A linha da agenda se lê num relance: horário em Fraunces, fio vertical, nome, serviço e status. Os estados vazios têm voz ("Dia livre… bom para descansar").
- A identidade do estúdio funciona: trocar acento e fundo muda título, sombras e barras.

**Problemas prioritários**
- **[P1] O cartão de quem está na maca não mostra o que importa.**
  - **O quê:** a Beatriz, alérgica à cola, aparece com um triângulo sem texto, e o destaque do próximo atendimento não aparece (item 2 do app inteiro).
  - **Correção:** escrever "Alergia à cola" no cartão atual, consertar o `cn` e recalcular "Agora / Em N min" a cada minuto no navegador.
  - **Comando:** `/impeccable harden`.
- **[P1] No celular, as pendências vêm depois do dinheiro e do XP.**
  - **O quê:** o grid de duas colunas do PC define a ordem do celular (`page.tsx:313-353`).
  - **Correção:** ordenar Agenda, Precisa de atenção (até 3 itens, contraindicação e sinal primeiro), Fila e Resumo do mês. O nível vira uma linha fina, e o PC ganha `grid-template-areas`.
  - **Comando:** `/impeccable layout`.
- **[P2] A home só mostra.**
  - **O quê:** as linhas abrem o dia, não o horário, e os nomes da fila não são tocáveis. Não há "Concluir e abrir ficha", "Sinal recebido" nem "Enviar". Os atalhos "Mensagens" (repete a pílula) e "Bloqueio" (ação rara) ocupam o lugar de ações do momento.
  - **Comando:** `/impeccable shape`.
- **[P2] No PC, a home fica mais estreita que no celular, e o painel lateral a repete.**
  - **O quê:** a 1024px, a coluna tem 321px e trunca "Beatriz Li…". O painel lateral repete "Hoje em resumo", as próximas clientes, a meta (o mesmo valor duas vezes, lado a lado) e os atalhos.
  - **Comando:** `/impeccable adapt`.

**Sinais por persona**
- **Duda, lash autônoma (10:23, Beatriz na maca):**
  - Vê o selo "Agora" bege, igual aos outros.
  - A alergia só aparece no perfil, e lá o painel também sai branco.
  - Para enviar as 4 mensagens, precisa rolar passando pelo "R$ 447,81".
  - Para concluir às 12:00, toca na linha, cai no dia e precisa procurar de novo.
- **Casey, celular numa mão só:** "Ver agenda" é um alvo de 87×20px no topo. O FAB cobre o "10%" da meta, e o serviço truncado esconde a técnica.
- **Sam, leitor de tela:**
  - As legendas da navegação têm contraste de 2,5:1, em 10px.
  - A contraindicação é só um `aria-label` num `span`.
  - A barra de nível não tem `role`.
  - O menu do FAB não fecha com Esc e não leva o foco aos itens.

**Observações menores**
- Entre 0h e 4h59 a saudação diz "Boa tarde" (`page.tsx:156`).
- "Em 75 min" se leria melhor como "Em 1h15".
- O vazio da agenda fala em "fila", mas o botão leva à agenda, não à lista de espera.
- Os alertas não seguem a gravidade: cola vencida aparece depois de aniversário.
- O avatar da saudação parece botão e não faz nada.
- A página espera a gamificação carregar antes de mostrar qualquer coisa.

**Perguntas**
- E se o Meu dia abrisse com um único cartão "Agora", com a cliente da maca, a contraindicação escrita, o sinal e "Concluir e abrir ficha", e o resto fosse uma lista de pendências por urgência?
- O nível precisa ficar acima da agenda todo dia?
- Se o ciclo é o diferencial nº 1, por que ele é a quarta seção?
