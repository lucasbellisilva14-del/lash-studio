import Link from "next/link";
import { LoginForm } from "./login-form";
import { IconCheckCircle, IconMoney, IconClock, IconLock } from "@/components/ui/icons";
import { LashLogo } from "@/components/brand/logo";

export const metadata = { title: "Entrar" };

/** Exemplos ilustrativos do que o app faz sozinho (não são dados reais). */
const MOMENTOS = [
  { icon: IconCheckCircle, titulo: "Horário confirmado", texto: "Amanhã, 14:00 · Volume brasileiro" },
  { icon: IconMoney, titulo: "Sinal recebido", texto: "Pix do sinal confirmado" },
  { icon: IconClock, titulo: "Hora da manutenção", texto: "Mensagem pronta na fila do dia" },
];

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  // Funcionária desativada pela dona: a sessão caiu em /sair?motivo=acesso.
  const acessoEncerrado = (Array.isArray(sp.acesso) ? sp.acesso[0] : sp.acesso) === "encerrado";
  const contaCriada = (Array.isArray(sp.conta) ? sp.conta[0] : sp.conta) === "criada";

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#1d1729] text-white">
      {/* Roxo da marca dominando o fundo, com o brilho da logo */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(900px_700px_at_18%_8%,#4a3d6e_0%,transparent_62%),radial-gradient(800px_600px_at_95%_105%,#33284d_0%,transparent_60%)]"
      />

      <div className="relative mx-auto grid min-h-dvh max-w-6xl items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1.1fr_minmax(0,440px)] lg:gap-16">
        {/* Marca e mensagem */}
        <div className="text-center lg:text-left">
          <Link href="/" className="inline-block" aria-label="LashOS, página inicial">
            <LashLogo grande />
          </Link>
          <h1 className="mx-auto mt-8 max-w-xl text-[34px] font-extrabold leading-[1.04] tracking-[-0.045em] text-balance sm:text-[44px] lg:mx-0 lg:mt-12 lg:text-[54px]">
            Seu estúdio inteiro, <span className="text-[#cfc6ea]">num app só.</span>
          </h1>
          <p className="mx-auto mt-4 hidden max-w-md text-[16px] leading-relaxed text-white/65 sm:block lg:mx-0">
            Agenda, clientes, ficha técnica, WhatsApp e financeiro, pensados para o ciclo dos cílios.
          </p>

          <ul className="mt-10 hidden max-w-sm space-y-3 lg:block" aria-label="Exemplos do que o LashOS faz">
            {MOMENTOS.map(({ icon: Icon, titulo, texto }, i) => (
              <li
                key={titulo}
                className="flex items-center gap-3.5 rounded-[18px] bg-white/[0.07] px-4 py-3.5 ring-1 ring-white/10 backdrop-blur-sm"
                style={{ marginLeft: i * 28 }}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#cfc6ea]/15 text-[#cfc6ea]">
                  <Icon width={18} height={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold">{titulo}</span>
                  <span className="block truncate text-[12.5px] text-white/60">{texto}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Formulário num cartão branco sobre o roxo */}
        <div className="w-full rounded-[30px] bg-surface p-7 text-ink shadow-[0_40px_100px_-30px_rgb(0_0_0/0.65)] sm:p-9">
          <h2 className="text-[26px] font-bold leading-[1.1] tracking-[-0.035em]">Bem-vinda de volta</h2>
          <p className="mb-7 mt-1.5 text-[15px] text-ink-soft">Entre para abrir o seu estúdio.</p>
          {contaCriada ? (
            <p role="status" className="mb-6 rounded-[14px] bg-success-soft px-4 py-3 text-[13.5px] leading-snug text-ink">
              Conta criada. Entre com o e-mail e a senha que você acabou de cadastrar.
            </p>
          ) : null}
          {acessoEncerrado ? (
            <div
              role="status"
              className="mb-6 flex items-start gap-2.5 rounded-[14px] bg-warning-soft px-4 py-3 text-[13.5px] leading-snug text-ink"
            >
              <IconLock width={17} height={17} className="mt-px shrink-0 text-warning" />
              <p>Seu acesso a este estúdio foi encerrado. Fale com a responsável pelo estúdio.</p>
            </div>
          ) : null}
          <LoginForm />
          <p className="mt-7 text-center text-[14px] text-ink-soft">
            Ainda não tem conta?{" "}
            <Link href="/comecar" className="whitespace-nowrap font-semibold text-ink underline underline-offset-4">
              Teste grátis por 7 dias
            </Link>
          </p>
        </div>

        <p className="text-center text-[12.5px] text-white/45 lg:col-span-2">Feito para lash designers brasileiras</p>
      </div>
    </div>
  );
}
