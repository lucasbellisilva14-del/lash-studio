import { requireProfessionalId } from "@/lib/session";
import { getGamification } from "@/lib/domain/gamification";
import { PageHeader } from "@/components/ui/page-header";
import { LevelCard } from "@/components/gamificacao/level-card";
import { AchievementsGrid } from "@/components/gamificacao/achievements-grid";
import { WeeklyChallenges } from "@/components/gamificacao/weekly-challenges";

export const metadata = { title: "Conquistas" };

export default async function ConquistasPage() {
  const professionalId = await requireProfessionalId();
  const game = await getGamification(professionalId);

  return (
    <div>
      <PageHeader
        title="Conquistas"
        subtitle="Cada atendimento te leva mais longe 💗"
        backHref="/mais"
      />

      <LevelCard level={game.level} />

      <section className="mt-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-display text-lg font-semibold text-ink">Desafios da semana</h2>
        </div>
        <WeeklyChallenges weekly={game.weekly} />
      </section>

      <section className="mt-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-display text-lg font-semibold text-ink">Medalhas</h2>
          <span className="text-sm font-medium text-ink-soft">
            {game.unlockedCount}/{game.totalCount}
          </span>
        </div>
        <AchievementsGrid achievements={game.achievements} />
      </section>

      <p className="mt-6 text-xs text-ink-faint text-center px-6">
        XP e medalhas nascem do seu trabalho de verdade: atendimentos, mensagens,
        anamneses e metas batidas. Continue brilhando ✨
      </p>
    </div>
  );
}
