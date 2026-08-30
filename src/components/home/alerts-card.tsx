import Link from "next/link";
import type { SVGProps } from "react";
import { Card } from "@/components/ui/card";
import {
  IconBox,
  IconChevronRight,
  IconClock,
  IconGift,
  IconMoney,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export type HomeAlertIcon = "deposit" | "birthday" | "maintenance" | "stock";
export type HomeAlertTone = "accent" | "warning" | "danger";

export type HomeAlert = {
  key: string;
  icon: HomeAlertIcon;
  tone: HomeAlertTone;
  title: string;
  description?: string;
  href: string;
};

const icons: Record<HomeAlertIcon, (p: SVGProps<SVGSVGElement>) => React.JSX.Element> = {
  deposit: IconMoney,
  birthday: IconGift,
  maintenance: IconClock,
  stock: IconBox,
};

const toneChip: Record<HomeAlertTone, string> = {
  accent: "bg-accent-soft text-accent-strong",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

/** Alertas compactos do dia: sinal pendente, aniversários, manutenção, estoque. */
export function AlertsCard({ alerts }: { alerts: HomeAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <Card className="divide-y divide-line overflow-hidden">
      {alerts.map((alert) => {
        const Icon = icons[alert.icon];
        return (
          <Link
            key={alert.key}
            href={alert.href}
            className="flex items-center gap-3 px-4 py-3 hover:bg-background transition-colors"
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                toneChip[alert.tone],
              )}
            >
              <Icon width={18} height={18} />
            </span>
            <span className="grow min-w-0">
              <span className="block text-sm font-medium text-ink truncate">{alert.title}</span>
              {alert.description ? (
                <span className="block text-[13px] text-ink-soft truncate">
                  {alert.description}
                </span>
              ) : null}
            </span>
            <IconChevronRight className="text-ink-faint shrink-0" width={16} height={16} />
          </Link>
        );
      })}
    </Card>
  );
}
