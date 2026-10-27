# Product

<!-- impeccable:product-schema 1 -->

Fatos confirmados por Lucas em entrevista (22/10/2026) e funcionalidades levantadas do código. O que não foi decidido aparece como "em aberto".

## Platform

web

## Users

**Usuária principal: a lash designer autônoma que atende sozinha.** Uma profissional, um login. Ela trabalha em casa ou numa sala própria e cuida de tudo sozinha: agenda, WhatsApp e dinheiro. Estúdios com equipe não são o alvo hoje.

Momentos de uso confirmados:

- **Entre uma cliente e outra**, no celular e com pressa: ver quem vem a seguir, mandar a mensagem da fila, marcar o sinal recebido.
- **Durante o atendimento**, com a cliente na maca e as mãos ocupadas: ficha técnica e fotos de antes e depois.
- **Com calma, no PC ou à noite**: financeiro, relatórios, estoque e configurações numa tela maior.

**Cliente final da profissional.** Não tem conta no LashOS. Chega pelo link público de agendamento (`/agendar/[slug]`), que a profissional manda no WhatsApp quando a cliente pede horário. É o único canal de chegada confirmado (bio do Instagram e Google não foram marcados). A cliente pede o horário, que fica pré-agendado, paga o Pix do sinal quando o serviço exige e recebe a confirmação pelo WhatsApp; com o Mercado Pago conectado, o pagamento já confirma o horário.

**Equipe da ONOS.** Opera o painel `/admin`, restrito por e-mail: cria contas, define preço e teste grátis, soma 30 dias, dá cortesia e suspende acesso.

## Product Purpose

O LashOS é o sistema de gestão da lash designer autônoma no Brasil: agenda, clientes, ficha técnica, anamnese, mensagens de WhatsApp, sinal por Pix, financeiro, estoque e relatórios num app só, no celular. Ele existe para tirar o estúdio do caderno, da planilha, da agenda do celular e das conversas soltas, e para que as regras do ofício (prazo da manutenção, sinal, faltas, validade da cola, contraindicação) trabalhem sozinhas.

**Estágio: piloto com venda assistida.** A conta piloto é a da Kay Cílios (Florianópolis), em produção em https://lash-studio-chi.vercel.app. As próximas contas serão vendidas e criadas pela ONOS no painel admin, com implantação acompanhada. Cadastro aberto (self-service) não está nos planos próximos.

A métrica de sucesso do piloto está em aberto.

## Positioning

Quatro diferenciais confirmados contra os apps genéricos de agenda de salão, todos para defender:

1. **Feito em volta do ciclo dos cílios.** Regra da manutenção dentro do prazo (passou do limite, vira aplicação), ficha técnica de cílios (técnica, mapping por zona, curvatura, espessura, cola e lote), validade da cola aberta e anamnese com alerta de contraindicação.
2. **WhatsApp + Pix.** A fila do dia traz as mensagens prontas (confirmação, lembrete de 24h, cuidados pós-aplicação, aviso de manutenção, aniversário, resgate de 45, 60 e 90 dias) e o sinal sai como Pix copia e cola. Com o Mercado Pago conectado, o dinheiro cai na conta da profissional e o horário confirma sozinho.
3. **Gestão que motiva.** XP, níveis, medalhas, desafios da semana, meta do mês e resumo da semana para compartilhar, tudo calculado dos dados reais. O app incentiva, não só controla.
4. **Tudo no celular.** Um app só no lugar de caderno, planilha, agenda do celular e anotações, feito para uso rápido entre uma cliente e outra.

## Operating Context

- **Aparelho.** Celular primeiro, como PWA instalável (manifest, service worker, push, vibração nos momentos de conquista). No PC, o mesmo app ganha sidebar e uma coluna lateral de gerenciamento.
- **Rotina do dia.** Um push traz o resumo do dia no horário que a profissional escolhe (padrão 07:30). "Meu dia" abre com a agenda de hoje, a fila de mensagens, os alertas (sinal pendente, aniversário, dia de manutenção, cola vencendo, estoque baixo) e o resumo do mês.
- **WhatsApp é o canal com a cliente.** As mensagens saem por link `wa.me` (envio manual em dois toques) ou, quando configurado, pelo envio automático da Evolution API.
- **Sinal.** Pix copia e cola. Com o Mercado Pago conectado por OAuth, o pagamento confirma o horário sozinho; sem ele, a cobrança usa a chave Pix do perfil e a confirmação é manual ("Sinal recebido"). No financeiro, a receita é sinal + restante do atendimento, sem duplicar.
- **Fechar o atendimento.** Marcar "concluído" na agenda leva à ficha técnica, onde ela registra técnica, mapping e fotos e cobra o restante.
- **Assinatura do LashOS.** Mensalidade recorrente no cartão pelo Mercado Pago. O valor é definido por conta no admin (padrão de R$ 99,00/mês no código). Situações: Cortesia (nunca bloqueia), Período de teste, Ativa (3 dias de tolerância depois do vencimento) e Suspensa. Com o acesso bloqueado, o app leva para `/assinatura` e os dados ficam guardados.
- **Implantação.** A conta nova nasce com serviços, templates de mensagem, horários e taxas copiados da conta modelo (a mais antiga) e mostra "Complete seu perfil" na tela inicial até o onboarding ser concluído.

## Capabilities and Constraints

**No ar hoje (levantado do código):**

- **Agenda:** dia, semana e mês; conflito e respiro entre atendimentos; antecedência mínima; bloqueios; lista de espera; regra da manutenção; sinal automático (obrigatório a partir de N faltas); cancelamento tardio; desfazer status; feed .ics para Google Agenda e iPhone.
- **Clientes:** status automático pelo ciclo (Ativa, Em risco, Inativa, Sem histórico), linha do tempo, origem, contagem de faltas e cancelamentos tardios, alerta de contraindicação, exportar e excluir dados (LGPD).
- **Ficha técnica:** técnica, fator de volume, curvaturas, espessura, mapping de 5 zonas (6 a 15 mm), cola e lote, retenção, duração real, fotos de antes e depois.
- **Anamnese digital:** perguntas de saúde ocular, flags de contraindicação, termo de consentimento editável e assinatura desenhada.
- **Mensagens:** templates editáveis com variáveis, fila do dia, mensagem avulsa e histórico.
- **Financeiro:** painel mensal, meta, despesas avulsas ou fixas, taxa da maquininha por forma de pagamento, gráfico de 6 meses e fechamento do mês para imprimir em PDF.
- **Estoque:** insumos, movimentações, baixa automática por atendimento e validade da cola aberta.
- **Relatórios:** status das clientes, LTV, serviços, demanda e origens.
- **Gamificação:** XP, 6 níveis (de "Aprendiz de Cílios" a "Lenda dos Cílios"), 13 medalhas e 4 desafios da semana; resumo da semana com imagem para compartilhar.
- **Link público:** serviço, dia e horário nos próximos 14 dias; anti-spam; sinal por Pix; imagem de prévia do link por estúdio. A vitrine de fotos está fora do ar: o componente (`src/components/agendar/gallery.tsx`) e a rota da foto existem, mas a galeria saiu da página e o botão de marcar foto saiu da ficha técnica no commit `afa2e23`, sem menção na mensagem.
- **Identidade do estúdio:** nome, logo e contatos aparecem no app e no link público. As cores escolhidas pela profissional valem só no link público (decisão de Lucas em 26/10/2026); o app de trabalho é neutro e igual para todas as contas. O link assina "feito com LashOS" só no rodapé.
- **Conta:** login por e-mail e senha, recuperação de senha por e-mail, sessão de 7 dias, freio de força bruta.

**Restrições:**

- Interface só em português do Brasil: datas dd/mm/aaaa, moeda em R$, horários no fuso da profissional.
- Uma conta é uma profissional. Não existe equipe nem agenda por profissional.
- Contas só nascem no admin; não há cadastro aberto.
- Dados sensíveis: anamnese (saúde), fotos de rosto e assinaturas. As fotos só são servidas para a dona da conta; o público vê apenas as fotos marcadas para a vitrine.
- Acessibilidade: sem requisito formal de conformidade (confirmado por Lucas).

**Termos do ofício usados no app:** aplicação, manutenção, remoção, lash lifting, brow lamination, sinal, ficha técnica, mapping, curvatura, espessura, anamnese, contraindicação, fila, resgate, vitrine, estúdio. Status do horário: Pré-agendado, Confirmado, Concluído, Faltou, Cancelado, Cancelamento tardio.

**Em aberto:**

- A métrica de sucesso do piloto.
- Quem preenche e assina a anamnese na prática. O momento "a cliente preenche e assina no aparelho da profissional" não foi marcado como uso real.

## Brand Commitments

- **Nome:** LashOS.
- **Voz (confirmada):** calorosa e próxima, falando com a profissional no feminino ("Bem-vinda de volta"). Nas telas de trabalho (financeiro, mensagens de erro, configurações), menos emoji e tom mais direto.
- **Frases de assinatura atuais:** "Feito para lash designers brasileiras 💗" no login; "feito com LashOS" no rodapé do link público.
- **Ativos existentes:** ícone do app (`public/icons/icon-192.png`, `public/icons/icon-512.png`, `src/app/icon.png`) e a marca em SVG de uma linha de cílios no login (`src/app/login/page.tsx`).

## Evidence on Hand

- Nenhuma prova autorizada: não há depoimento, número de uso, case nem foto liberados para citar em telas ou materiais. Ninguém deve inventar.
- A conta piloto existe e está em produção, mas isso não autoriza citar a Kay, os números da conta ou as fotos da vitrine fora do link público.
- Os dados do seed (`prisma/seed.ts`) são fictícios e servem para demonstrar as regras no banco de dev; não são prova de uso.

## Product Principles

1. **Cada momento tem seu ritmo.** Entre uma cliente e outra, a tela responde em segundos quem vem agora, o que falta mandar e o que está pendente. Durante o atendimento, registrar ficha e fotos cabe em poucos toques, com as mãos ocupadas. À noite, no PC, financeiro e relatórios podem pedir mais atenção.
2. **As regras do ofício trabalham sozinhas.** Prazo da manutenção, sinal, faltas, validade da cola e contraindicação viram alertas, bloqueios e mensagens prontas. A profissional decide; o app lembra.
3. **O WhatsApp é o caminho da cliente.** Tudo que sai para a cliente final (mensagem, link de agendamento, Pix do sinal) precisa funcionar a partir de uma conversa no celular.
4. **Calor na voz, objetividade no trabalho.** O tom acolhedor e a gamificação fazem parte do produto; nas telas de trabalho, o texto vai direto ao ponto.
5. **Só fato verdadeiro.** Sem prova autorizada, nada de depoimento, número ou case inventado; o que o app mostra sai dos dados reais da conta.
