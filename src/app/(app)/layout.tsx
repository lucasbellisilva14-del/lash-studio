import { requireProfessional } from "@/lib/session";
import { BottomNav } from "@/components/shell/bottom-nav";
import { PwaRegister } from "@/components/shell/pwa-register";
import { InstallPrompt } from "@/components/shell/install-prompt";
import { Sidebar } from "@/components/shell/sidebar";
import { DesktopRail } from "@/components/shell/desktop-rail";

/**
 * Shell autenticado: injeta cor de acento e fundo da profissional.
 * Celular: coluna única + pílula de navegação inferior.
 * Desktop (lg+): sidebar à esquerda, conteúdo central e coluna de gerenciamento.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const professional = await requireProfessional();

  return (
    <div
      className="accent-scope app-bg min-h-dvh lg:flex"
      style={{
        ["--accent" as string]: professional.accentColor,
        ["--bg" as string]: professional.backgroundColor,
      }}
    >
      <Sidebar
        studioName={professional.studioName}
        professionalName={professional.name}
        logoUrl={professional.logoUrl}
        slug={professional.slug}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <main className="mx-auto w-full max-w-lg grow px-4 pt-4 pb-[calc(112px+env(safe-area-inset-bottom))] lg:max-w-none lg:mx-0 lg:px-10 lg:pt-8 lg:pb-12 lg:flex lg:items-start lg:gap-8 xl:px-14">
          <div className="lg:flex-1 lg:min-w-0 lg:max-w-3xl xl:max-w-4xl">{children}</div>
          <DesktopRail professional={professional} />
        </main>
      </div>

      <div className="lg:hidden">
        <BottomNav />
        <InstallPrompt />
      </div>
      <PwaRegister />
    </div>
  );
}
