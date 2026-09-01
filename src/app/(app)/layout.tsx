import { requireProfessional } from "@/lib/session";
import { BottomNav } from "@/components/shell/bottom-nav";
import { PwaRegister } from "@/components/shell/pwa-register";
import { InstallPrompt } from "@/components/shell/install-prompt";

/**
 * Shell autenticado: injeta a cor de acento da profissional,
 * limita a largura (mobile-first) e ancora a bottom nav.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const professional = await requireProfessional();

  return (
    <div
      className="accent-scope min-h-dvh flex flex-col"
      style={{ ["--accent" as string]: professional.accentColor }}
    >
      <main className="mx-auto w-full max-w-lg grow px-4 pt-4 pb-[calc(96px+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <BottomNav />
      <InstallPrompt />
      <PwaRegister />
    </div>
  );
}
