/**
 * Seed de demonstração: 1 profissional, 6 serviços, 5 clientes com históricos
 * variados — toda tela já nasce demonstrável.
 *
 * Login: demo@lashos.com.br / lashos123
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, subDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

const prisma = new PrismaClient();
const TZ = "America/Sao_Paulo";

/** Data local (dias a partir de hoje) + hora "HH:mm" → instante UTC. */
function at(daysFromToday: number, time: string): Date {
  const base = daysFromToday >= 0 ? addDays(new Date(), daysFromToday) : subDays(new Date(), -daysFromToday);
  const dayKey = formatInTimeZone(base, TZ, "yyyy-MM-dd");
  return fromZonedTime(`${dayKey}T${time}:00`, TZ);
}

/** Aniversário: dia/mês de hoje + offset, em um ano fixo. */
function birthday(daysFromToday: number, year: number): Date {
  const base = addDays(new Date(), daysFromToday);
  const monthDay = formatInTimeZone(base, TZ, "MM-dd");
  return new Date(`${year}-${monthDay}T12:00:00Z`);
}

async function main() {
  console.log("🌱 Limpando banco...");
  // ordem respeita FKs (cascade cobre a maioria)
  await prisma.professional.deleteMany();

  console.log("🌱 Criando profissional...");
  const professional = await prisma.professional.create({
    data: {
      email: "demo@lashos.com.br",
      passwordHash: bcrypt.hashSync("lashos123", 10),
      name: "Marina Duarte",
      studioName: "Studio Marina Lash",
      slug: "studio-marina-lash",
      accentColor: "#A85566",
      addressLine: "Rua das Gaivotas, 120 — Ingleses, Florianópolis/SC",
      mapsUrl: "https://maps.app.goo.gl/exemplo-studio-marina",
      whatsapp: "48991234567",
      instagram: "@studiomarinalash",
      pixKey: "48991234567",
      onboardingDone: true,
      workingHours: {
        create: [
          { weekday: 1, startTime: "13:00", endTime: "19:00" }, // segunda (meio período)
          { weekday: 2, startTime: "09:00", endTime: "19:00" },
          { weekday: 3, startTime: "09:00", endTime: "19:00" },
          { weekday: 4, startTime: "09:00", endTime: "19:00" },
          { weekday: 5, startTime: "09:00", endTime: "19:00" },
          { weekday: 6, startTime: "08:00", endTime: "17:00" }, // sábado
        ],
      },
      paymentFees: {
        create: [
          { method: "PIX", feePct: 0 },
          { method: "DINHEIRO", feePct: 0 },
          { method: "DEBITO", feePct: 1.99 },
          { method: "CREDITO_VISTA", feePct: 4.99 },
          { method: "CREDITO_PARCELADO", feePct: 12.5 },
        ],
      },
      scheduleBlocks: {
        create: [
          { title: "Almoço", type: "SEMANAL", weekday: 2, startTime: "12:00", endTime: "13:00" },
          { title: "Almoço", type: "SEMANAL", weekday: 3, startTime: "12:00", endTime: "13:00" },
          { title: "Almoço", type: "SEMANAL", weekday: 4, startTime: "12:00", endTime: "13:00" },
          { title: "Almoço", type: "SEMANAL", weekday: 5, startTime: "12:00", endTime: "13:00" },
        ],
      },
    },
  });
  const pid = professional.id;

  console.log("🌱 Criando serviços...");
  const aplicacaoClassico = await prisma.service.create({
    data: { professionalId: pid, name: "Aplicação — Clássico fio a fio", category: "APLICACAO", durationMin: 150, priceCents: 16000, requiresDeposit: true },
  });
  const aplicacaoBrasileiro = await prisma.service.create({
    data: { professionalId: pid, name: "Aplicação — Volume brasileiro", category: "APLICACAO", durationMin: 165, priceCents: 18000, requiresDeposit: true },
  });
  const aplicacaoRusso = await prisma.service.create({
    data: { professionalId: pid, name: "Aplicação — Volume russo", category: "APLICACAO", durationMin: 180, priceCents: 22000, requiresDeposit: true },
  });
  const manutencaoClassico = await prisma.service.create({
    data: { professionalId: pid, name: "Manutenção — Clássico", category: "MANUTENCAO", durationMin: 90, priceCents: 9000, maintenanceOfId: aplicacaoClassico.id },
  });
  const manutencaoVolume = await prisma.service.create({
    data: { professionalId: pid, name: "Manutenção — Volume", category: "MANUTENCAO", durationMin: 105, priceCents: 11000, maintenanceOfId: aplicacaoBrasileiro.id },
  });
  await prisma.service.create({
    data: { professionalId: pid, name: "Lash lifting", category: "LASH_LIFTING", durationMin: 75, priceCents: 13000 },
  });

  console.log("🌱 Criando templates de WhatsApp...");
  const templates: Array<{ kind: string; name: string; body: string }> = [
    {
      kind: "CONFIRMACAO",
      name: "Confirmação de agendamento",
      body: "Oi, {{nome}}! Aqui é do {{nome_estudio}} 💗\n\nSeu horário está reservado:\n📅 {{data}} às {{hora}}\n✨ {{servico}} — {{valor}}\n📍 {{endereco}}\n\nPara confirmar, envie o sinal de {{valor_sinal}} via Pix (copia e cola 👇):\n{{pix_copia_cola}}\n\nCancelamentos sem custo até 24h antes. Depois disso, o sinal não é devolvido, combinado? Qualquer coisa é só chamar!",
    },
    {
      kind: "LEMBRETE_24H",
      name: "Lembrete 24h antes",
      body: "Oi, {{nome}}! Passando para lembrar do seu horário amanhã 💚\n\n📅 {{data}} às {{hora}}\n✨ {{servico}}\n📍 {{endereco}}\n\nDica: venha sem maquiagem nos olhos e evite cafeína antes. Até amanhã!",
    },
    {
      kind: "POS_APLICACAO",
      name: "Cuidados pós-aplicação",
      body: "Oi, {{nome}}! Obrigada pela visita de hoje 💚 Seus cílios ficaram lindos!\n\nCuidados para durar mais:\n💧 Não molhar por 24h\n🚿 Evitar vapor quente e sauna nos primeiros dias\n🙅‍♀️ Nada de rímel à prova d'água\n🧴 Não usar demaquilante oleoso\n🪮 Escovar diariamente com a escovinha\n😴 Dormir de barriga para cima ajuda muito\n\nQualquer coisa, me chama!",
    },
    {
      kind: "MANUTENCAO",
      name: "Aviso de manutenção",
      body: "Oi, {{nome}}! 💚 Seus cílios já estão pedindo manutenção — estamos chegando no limite do ciclo.\n\nQuer garantir seu horário essa semana? Me diz o melhor dia que eu encaixo você. Depois do prazo, precisa ser aplicação nova, então vale aproveitar!",
    },
    {
      kind: "ANIVERSARIO",
      name: "Feliz aniversário",
      body: "{{nome}}, parabéns! 🎉💚\n\nO {{nome_estudio}} deseja um dia incrível para você! E tem presente: 10% de desconto em qualquer serviço este mês. É só agendar e mencionar essa mensagem. Beijos!",
    },
    {
      kind: "RESGATE_45",
      name: "Resgate — 45 dias",
      body: "Oi, {{nome}}! Sentimos sua falta por aqui 💚 Já faz um tempinho desde seu último atendimento.\n\nQue tal renovar o olhar? Me conta qual dia fica bom que eu encontro um horário especial para você!",
    },
    {
      kind: "RESGATE_60",
      name: "Resgate — 60 dias",
      body: "Oi, {{nome}}! Tudo bem? 💚 Faz 2 meses que você não aparece no {{nome_estudio}} e a gente sente falta!\n\nPreparei uma condição especial para o seu retorno. Me chama que te conto!",
    },
    {
      kind: "RESGATE_90",
      name: "Resgate — 90 dias",
      body: "Oi, {{nome}}! 💚 Já faz 3 meses… seu olhar merece esse carinho de novo!\n\nPara facilitar seu retorno: 15% de desconto em qualquer aplicação este mês. Vamos agendar?",
    },
  ];
  const templateByKind = new Map<string, string>();
  for (const t of templates) {
    const created = await prisma.messageTemplate.create({
      data: { professionalId: pid, kind: t.kind, name: t.name, body: t.body },
    });
    templateByKind.set(t.kind, created.id);
  }

  console.log("🌱 Criando clientes e históricos...");

  // ── 1. Juliana — no dia 14 do ciclo (aplicação volume brasileiro há 14 dias) ──
  const juliana = await prisma.client.create({
    data: {
      professionalId: pid, name: "Juliana Souza", phone: "48999110001",
      instagram: "@ju.souza", source: "INSTAGRAM",
      birthDate: new Date("1996-03-22T12:00:00Z"),
      notes: "Prefere volume mais natural. Sensibilidade leve no canto externo.",
    },
  });
  const julianaApl = await prisma.appointment.create({
    data: {
      professionalId: pid, clientId: juliana.id, serviceId: aplicacaoBrasileiro.id,
      startAt: at(-14, "09:30"), endAt: at(-14, "12:15"),
      status: "CONCLUIDO", priceCents: 18000,
      depositRequired: true, depositCents: 5400, depositPaidAt: at(-16, "10:00"),
    },
  });
  await prisma.attendanceRecord.create({
    data: {
      professionalId: pid, appointmentId: julianaApl.id, clientId: juliana.id,
      technique: "VOLUME_BRASILEIRO", curvatures: "C,D", thickness: "0.07",
      mappingJson: JSON.stringify({ zones: [8, 9, 11, 10, 9] }),
      glueBrand: "Elite HS-10", glueBatch: "L2306-04", durationMin: 160,
      notes: "Lacrimejou pouco. Dorme de lado direito — reforçado canto externo esquerdo.",
    },
  });
  await prisma.transaction.create({
    data: {
      professionalId: pid, type: "RECEITA", kind: "ATENDIMENTO",
      appointmentId: julianaApl.id, clientId: juliana.id,
      description: "Aplicação — Volume brasileiro (Juliana Souza)",
      amountCents: 18000, method: "PIX", feePct: 0, feeCents: 0, netCents: 18000,
      date: at(-14, "12:15"),
    },
  });
  // Juliana também tem horário HOJE (mostra a agenda do dia)
  await prisma.appointment.create({
    data: {
      professionalId: pid, clientId: juliana.id, serviceId: manutencaoVolume.id,
      startAt: at(0, "16:00"), endAt: at(0, "17:45"),
      status: "CONFIRMADO", priceCents: 11000,
    },
  });

  // ── 2. Carla — inativa (último atendimento há 75 dias) ──
  const carla = await prisma.client.create({
    data: {
      professionalId: pid, name: "Carla Mendes", phone: "48999110002",
      source: "INDICACAO", birthDate: new Date("1988-11-05T12:00:00Z"),
      notes: "Veio por indicação da Juliana.",
    },
  });
  const carlaApl = await prisma.appointment.create({
    data: {
      professionalId: pid, clientId: carla.id, serviceId: aplicacaoClassico.id,
      startAt: at(-75, "14:00"), endAt: at(-75, "16:30"),
      status: "CONCLUIDO", priceCents: 16000,
    },
  });
  await prisma.attendanceRecord.create({
    data: {
      professionalId: pid, appointmentId: carlaApl.id, clientId: carla.id,
      technique: "CLASSICO", curvatures: "C", thickness: "0.10",
      mappingJson: JSON.stringify({ zones: [7, 8, 10, 10, 8] }),
      glueBrand: "Elite HS-10", glueBatch: "L2304-11", durationMin: 145,
    },
  });
  await prisma.transaction.create({
    data: {
      professionalId: pid, type: "RECEITA", kind: "ATENDIMENTO",
      appointmentId: carlaApl.id, clientId: carla.id,
      description: "Aplicação — Clássico fio a fio (Carla Mendes)",
      amountCents: 16000, method: "CREDITO_VISTA", feePct: 4.99, feeCents: 798, netCents: 15202,
      date: at(-75, "16:30"),
    },
  });

  // ── 3. Beatriz — contraindicação na anamnese + sinal pendente em 48h ──
  const beatriz = await prisma.client.create({
    data: {
      professionalId: pid, name: "Beatriz Lima", phone: "48999110003",
      instagram: "@bea.lima", source: "GOOGLE",
      birthDate: new Date("1992-07-14T12:00:00Z"),
    },
  });
  await prisma.anamnesisForm.create({
    data: {
      professionalId: pid, clientId: beatriz.id,
      answersJson: JSON.stringify({
        gestanteOuLactante: false,
        alergias: "Reação alérgica a cianoacrilato em extensão anterior",
        glaucomaOuColirio: true,
        irritacaoOcularRecente: false,
        cirurgiaOcular6m: false,
        lentesDeContato: true,
        tireoideOuOncologico: false,
        jaFezExtensao: true,
        reacaoAnterior: "Vermelhidão e coceira por 3 dias",
      }),
      contraindicationFlags: JSON.stringify(["ALERGIA_CIANOACRILATO", "GLAUCOMA_COLIRIO"]),
      hasContraindication: true,
      naturalLashCondition: "MEDIOS",
      lgpdConsent: true,
    },
  });
  // pré-agendado aguardando sinal (dispara alerta de sinal pendente nas próximas 48h)
  await prisma.appointment.create({
    data: {
      professionalId: pid, clientId: beatriz.id, serviceId: aplicacaoRusso.id,
      startAt: at(1, "09:00"), endAt: at(1, "12:00"),
      status: "PRE_AGENDADO", priceCents: 22000,
      depositRequired: true, depositCents: 6600,
    },
  });

  // ── 4. Fernanda — aniversariante de hoje, ciclo ativo, horário amanhã ──
  const fernanda = await prisma.client.create({
    data: {
      professionalId: pid, name: "Fernanda Castro", phone: "48999110004",
      instagram: "@fe.castro", source: "INSTAGRAM",
      birthDate: birthday(0, 1994),
      notes: "Cliente desde 2024. Sempre pontual.",
    },
  });
  const fernandaApl = await prisma.appointment.create({
    data: {
      professionalId: pid, clientId: fernanda.id, serviceId: aplicacaoRusso.id,
      startAt: at(-31, "09:00"), endAt: at(-31, "12:00"),
      status: "CONCLUIDO", priceCents: 22000,
      depositRequired: true, depositCents: 6600, depositPaidAt: at(-33, "18:00"),
    },
  });
  await prisma.attendanceRecord.create({
    data: {
      professionalId: pid, appointmentId: fernandaApl.id, clientId: fernanda.id,
      technique: "VOLUME_RUSSO", volumeFactor: "4D", curvatures: "CC,D", thickness: "0.05",
      mappingJson: JSON.stringify({ zones: [8, 10, 12, 11, 9] }),
      glueBrand: "Sky S+", glueBatch: "S2401-77", durationMin: 175,
    },
  });
  const fernandaManut = await prisma.appointment.create({
    data: {
      professionalId: pid, clientId: fernanda.id, serviceId: manutencaoVolume.id,
      startAt: at(-10, "14:00"), endAt: at(-10, "15:45"),
      status: "CONCLUIDO", priceCents: 11000,
    },
  });
  await prisma.attendanceRecord.create({
    data: {
      professionalId: pid, appointmentId: fernandaManut.id, clientId: fernanda.id,
      technique: "VOLUME_RUSSO", volumeFactor: "4D", curvatures: "CC,D", thickness: "0.05",
      mappingJson: JSON.stringify({ zones: [8, 10, 12, 11, 9] }),
      glueBrand: "Sky S+", glueBatch: "S2401-77",
      retentionPct: 60, durationMin: 100,
      notes: "Retenção boa. Reforço no canto externo direito.",
    },
  });
  await prisma.transaction.createMany({
    data: [
      {
        professionalId: pid, type: "RECEITA", kind: "ATENDIMENTO",
        appointmentId: fernandaApl.id, clientId: fernanda.id,
        description: "Aplicação — Volume russo (Fernanda Castro)",
        amountCents: 22000, method: "PIX", feePct: 0, feeCents: 0, netCents: 22000,
        date: at(-31, "12:00"),
      },
      {
        professionalId: pid, type: "RECEITA", kind: "ATENDIMENTO",
        appointmentId: fernandaManut.id, clientId: fernanda.id,
        description: "Manutenção — Volume (Fernanda Castro)",
        amountCents: 11000, method: "DEBITO", feePct: 1.99, feeCents: 219, netCents: 10781,
        date: at(-10, "15:45"),
      },
    ],
  });
  // horário amanhã → entra no lembrete 24h da fila
  await prisma.appointment.create({
    data: {
      professionalId: pid, clientId: fernanda.id, serviceId: manutencaoVolume.id,
      startAt: at(1, "14:00"), endAt: at(1, "15:45"),
      status: "CONFIRMADO", priceCents: 11000,
    },
  });

  // ── 5. Patrícia — dia 16 do ciclo (aviso de manutenção HOJE) + 2 no-shows ──
  const patricia = await prisma.client.create({
    data: {
      professionalId: pid, name: "Patrícia Alves", phone: "48999110005",
      source: "PASSOU_NA_FRENTE", noShowCount: 2, lateCancelCount: 1,
      birthDate: new Date("1990-01-30T12:00:00Z"),
      notes: "Já faltou 2x sem avisar — exigir sinal em todo agendamento.",
    },
  });
  const patriciaApl = await prisma.appointment.create({
    data: {
      professionalId: pid, clientId: patricia.id, serviceId: aplicacaoClassico.id,
      startAt: at(-16, "10:00"), endAt: at(-16, "12:30"),
      status: "CONCLUIDO", priceCents: 16000,
      depositRequired: true, depositCents: 4800, depositPaidAt: at(-18, "09:00"),
    },
  });
  await prisma.attendanceRecord.create({
    data: {
      professionalId: pid, appointmentId: patriciaApl.id, clientId: patricia.id,
      technique: "CLASSICO", curvatures: "B,C", thickness: "0.15",
      mappingJson: JSON.stringify({ zones: [7, 8, 9, 9, 8] }),
      glueBrand: "Elite HS-10", glueBatch: "L2306-04", durationMin: 150,
    },
  });
  await prisma.transaction.create({
    data: {
      professionalId: pid, type: "RECEITA", kind: "ATENDIMENTO",
      appointmentId: patriciaApl.id, clientId: patricia.id,
      description: "Aplicação — Clássico fio a fio (Patrícia Alves)",
      amountCents: 16000, method: "DINHEIRO", feePct: 0, feeCents: 0, netCents: 16000,
      date: at(-16, "12:30"),
    },
  });
  // histórico de no-shows registrados
  await prisma.appointment.createMany({
    data: [
      {
        professionalId: pid, clientId: patricia.id, serviceId: manutencaoClassico.id,
        startAt: at(-40, "15:00"), endAt: at(-40, "16:30"), status: "FALTOU", priceCents: 9000,
      },
      {
        professionalId: pid, clientId: patricia.id, serviceId: manutencaoClassico.id,
        startAt: at(-55, "11:00"), endAt: at(-55, "12:30"), status: "FALTOU", priceCents: 9000,
      },
    ],
  });

  // ── Lista de espera ──
  await prisma.waitlistEntry.create({
    data: {
      professionalId: pid, clientId: carla.id, serviceId: aplicacaoClassico.id,
      dateFrom: at(0, "08:00"), dateTo: at(7, "19:00"),
      periodNote: "Qualquer manhã desta semana",
    },
  });

  // ── Despesas e meta do mês ──
  const monthKey = formatInTimeZone(new Date(), TZ, "yyyy-MM");
  await prisma.transaction.createMany({
    data: [
      {
        professionalId: pid, type: "DESPESA", description: "Cola Elite HS-10 (2un)",
        category: "MATERIAL", amountCents: 18900, netCents: 18900,
        recurrence: "AVULSA", date: at(-9, "10:00"),
      },
      {
        professionalId: pid, type: "DESPESA", description: "Aluguel da sala",
        category: "ALUGUEL", amountCents: 80000, netCents: 80000,
        recurrence: "FIXA_MENSAL", date: at(-5, "09:00"),
      },
      {
        professionalId: pid, type: "DESPESA", description: "Impulsionamento Instagram",
        category: "MARKETING", amountCents: 15000, netCents: 15000,
        recurrence: "AVULSA", date: at(-3, "12:00"),
      },
    ],
  });
  await prisma.goal.create({
    data: { professionalId: pid, month: monthKey, revenueTargetCents: 450000 },
  });

  // ── Estoque básico (colas com validade pós-abertura) ──
  await prisma.product.createMany({
    data: [
      {
        professionalId: pid, name: "Cola Elite HS-10", category: "COLA",
        quantity: 1, minQuantity: 1, unit: "un", costCents: 9450,
        openedAt: at(-20, "09:00"), shelfLifeDaysAfterOpen: 35,
      },
      {
        professionalId: pid, name: "Fios D 0.07 mix 8-14", category: "FIOS",
        specJson: JSON.stringify({ curvatura: "D", espessura: "0.07", tamanho: "mix 8-14" }),
        quantity: 3, minQuantity: 2, unit: "caixa", costCents: 4500,
      },
      {
        professionalId: pid, name: "Pads de silicone", category: "PADS",
        quantity: 12, minQuantity: 20, unit: "par", costCents: 150,
      },
    ],
  });

  console.log("✅ Seed concluído!");
  console.log("   Login: demo@lashos.com.br");
  console.log("   Senha: lashos123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
