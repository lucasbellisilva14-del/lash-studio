import { requireProfessional } from "@/lib/session";
import { formatPhone } from "@/lib/phone";
import { PageHeader } from "@/components/ui/page-header";
import { PerfilForm } from "./perfil-form";

export const metadata = { title: "Perfil do estúdio" };

export default async function PerfilPage() {
  const p = await requireProfessional();

  return (
    <div>
      <PageHeader
        title="Perfil do estúdio"
        subtitle="Seus dados e a identidade visual do app"
        backHref="/config"
      />
      <PerfilForm
        defaults={{
          name: p.name,
          studioName: p.studioName,
          logoUrl: p.logoUrl,
          accentColor: p.accentColor,
          addressLine: p.addressLine ?? "",
          mapsUrl: p.mapsUrl ?? "",
          whatsapp: p.whatsapp ? formatPhone(p.whatsapp) : "",
          instagram: p.instagram ?? "",
          pixKey: p.pixKey ?? "",
        }}
      />
    </div>
  );
}
