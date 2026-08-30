/** Ícones locais do módulo Configurações (traço 1.75, estilo Lucide) — não editar o kit global. */
import type { SVGProps } from "react";

function base(props: SVGProps<SVGSVGElement>) {
  return {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    width: 20,
    height: 20,
    ...props,
  };
}

export const IconUser = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="8" r="3.5" /><path d="M5 20.5c.7-3.8 3.5-5.8 7-5.8s6.3 2 7 5.8" /></svg>
);
export const IconShield = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3l7 2.6v5.6c0 4.5-2.9 7.7-7 9.3-4.1-1.6-7-4.8-7-9.3V5.6L12 3Z" /><path d="m9 11.8 2.2 2.2 4.3-4.6" /></svg>
);
export const IconPercent = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M19 5 5 19" /><circle cx="7" cy="7" r="2.4" /><circle cx="17" cy="17" r="2.4" /></svg>
);
export const IconPalette = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3a9 9 0 1 0 0 18c1.6 0 2.1-1 1.5-2.1-.5-1-.1-1.9 1.2-1.9H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10Z" /><circle cx="7.6" cy="11.5" r=".9" fill="currentColor" stroke="none" /><circle cx="10.5" cy="7.6" r=".9" fill="currentColor" stroke="none" /><circle cx="15" cy="7.2" r=".9" fill="currentColor" stroke="none" /></svg>
);
export const IconStore = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 10v10h16V10" /><path d="M3 6.5 5 3h14l2 3.5a2.4 2.4 0 0 1-4.5 1.2 2.4 2.4 0 0 1-4.5 0A2.4 2.4 0 0 1 7.5 7.7 2.4 2.4 0 0 1 3 6.5Z" /><path d="M9.5 20v-5.5h5V20" /></svg>
);
export const IconPix = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="m8.2 3.5 3.8 3.8 3.8-3.8M3.5 8.2l3.8 3.8-3.8 3.8M20.5 8.2l-3.8 3.8 3.8 3.8M8.2 20.5l3.8-3.8 3.8 3.8" /><path d="M12 9.4 14.6 12 12 14.6 9.4 12 12 9.4Z" /></svg>
);
