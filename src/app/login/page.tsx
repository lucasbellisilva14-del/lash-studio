import Link from "next/link";
import { LoginForm } from "./login-form";
import { IconCheckCircle, IconMoney, IconClock, IconLock } from "@/components/ui/icons";

export const metadata = { title: "Entrar" };

/** Exemplos ilustrativos do que o app faz sozinho (não são dados reais). */
const MOMENTOS = [
  { icon: IconCheckCircle, titulo: "Horário confirmado", texto: "Amanhã, 14:00 · Volume brasileiro" },
  { icon: IconMoney, titulo: "Sinal recebido", texto: "Pix confirmado sozinho no Mercado Pago" },
  { icon: IconClock, titulo: "Hora da manutenção", texto: "Mensagem pronta na fila do dia" },
];

function MarcaLashOS({ grande }: { grande?: boolean }) {
  return (
    <div
      className={
        grande
          ? "flex h-14 w-14 items-center justify-center rounded-[18px] bg-white/12"
          : "mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-[18px] bg-accent shadow-[var(--shadow-pop)]"
      }
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
        className="h-8 w-8"
        aria-hidden
      >
        <path d="M4 9c2.5 3.5 13.5 3.5 16 0" />
        <path d="M6 11.2 4.8 13M9.2 12.4l-.7 2M12 12.8v2.1M14.8 12.4l.7 2M18 11.2l1.2 1.8" />
      </svg>
    </div>
  );
}

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  // Funcionária desativada pela dona: a sessão caiu em /sair?motivo=acesso.
  const acessoEncerrado = (Array.isArray(sp.acesso) ? sp.acesso[0] : sp.acesso) === "encerrado";
  const contaCriada = (Array.isArray(sp.conta) ? sp.conta[0] : sp.conta) === "criada";

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      {/* Painel da marca — só no PC: foto do atendimento escurecida, textos por cima */}
      <aside className="relative hidden overflow-hidden bg-accent p-12 text-accent-ink lg:m-3 lg:flex lg:flex-col lg:justify-between lg:rounded-[28px] xl:p-16">
        {/* eslint-disable-next-line @next/next/no-img-element -- foto estática, sem otimização */}
        <img
          src="/login-bg.webp"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-[70%_center]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(90deg,rgb(42_34_64/0.92)_0%,rgb(42_34_64/0.72)_45%,rgb(42_34_64/0.45)_100%)]"
        />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,rgb(23_21_30/0.55))]" />
        <div className="relative">
          <MarcaLashOS grande />
          <h1 className="mt-10 max-w-md text-[44px] font-bold leading-[1.05] tracking-[-0.04em] xl:text-[52px]">
            Seu estúdio inteiro, num app só.
          </h1>
          <p className="mt-4 max-w-md text-[16px] leading-relaxed text-white/70">
            Agenda, clientes, ficha técnica, WhatsApp e financeiro, pensados para o ciclo dos cílios.
          </p>
        </div>

        <ul className="relative max-w-sm space-y-3" aria-label="Exemplos do que o LashOS faz">
          {MOMENTOS.map(({ icon: Icon, titulo, texto }, i) => (
            <li
              key={titulo}
              className="flex items-center gap-3.5 rounded-[18px] bg-white px-4 py-3.5 text-ink shadow-[var(--shadow-pop)]"
              style={{ marginLeft: i * 28 }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink">
                <Icon width={18} height={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold">{titulo}</span>
                <span className="block truncate text-[12.5px] text-ink-soft">{texto}</span>
              </span>
            </li>
          ))}
        </ul>

        <p className="relative text-[12.5px] text-white/60">Feito para lash designers brasileiras</p>
      </aside>

      {/* Formulário */}
      <div className="flex min-h-dvh flex-col justify-center px-6 py-10 lg:min-h-0">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-9 text-center lg:text-left">
            <div className="lg:hidden">
              <MarcaLashOS />
            </div>
            <h2 className="text-[30px] font-bold leading-[1.1] tracking-[-0.035em] text-ink">
              Bem-vinda de volta
            </h2>
            <p className="mt-2 text-[15px] text-ink-soft">Entre para abrir o seu estúdio.</p>
          </div>
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
          <p className="mt-8 text-center text-[14px] text-ink-soft">
            Ainda não tem conta?{" "}
            <Link href="/comecar" className="font-semibold text-ink underline underline-offset-4">
              Teste grátis por 7 dias
            </Link>
          </p>
          <p className="mt-10 text-center text-[12.5px] text-ink-faint lg:hidden">
            Feito para lash designers brasileiras
          </p>
        </div>
      </div>
    </div>
  );
}
