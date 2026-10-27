import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { IconLink } from "@/components/ui/icons";

/** Convite vencido, já usado ou cancelado (serve na página e no formulário). */
export function ConviteInvalido() {
  return (
    <div className="text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] bg-surface text-ink-soft shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)]">
        <IconLink width={24} height={24} />
      </span>
      <h1 className="mt-6 text-[28px] font-bold leading-[1.12] tracking-[-0.035em] text-ink">
        Convite indisponível
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
        Este convite expirou ou já foi usado. Peça um novo para a responsável pelo estúdio.
      </p>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
        Já criou sua senha? É só entrar com o seu e-mail.
      </p>
      <Link href="/login" className={buttonClasses("secondary", "md", "mt-7")}>
        Ir para o login
      </Link>
    </div>
  );
}
