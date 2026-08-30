import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Meu dia" };

// Placeholder — a tela "Meu dia" completa é montada pelo módulo home.
export default function HomePage() {
  return <PageHeader title="Meu dia" subtitle="Carregando seu resumo..." />;
}
