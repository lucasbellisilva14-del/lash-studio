/** Ícones do módulo — mesmo traço Hugeicons do kit (ver ui/icons.tsx). */
import type { SVGProps } from "react";
import { makeIcon } from "@/components/ui/icons";
import {
  PaintBoardIcon,
  PercentCircleIcon,
  Shield01Icon,
  Store01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";

export const IconUser = makeIcon(UserIcon, "IconUser");
export const IconShield = makeIcon(Shield01Icon, "IconShield");
export const IconPercent = makeIcon(PercentCircleIcon, "IconPercent");
export const IconPalette = makeIcon(PaintBoardIcon, "IconPalette");
export const IconStore = makeIcon(Store01Icon, "IconStore");

/** Pix não existe no Hugeicons: desenhado à mão no mesmo traço (1.5, pontas redondas). */
export const IconPix = ({ width, height, ...p }: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    width={width ?? 20}
    height={height ?? width ?? 20}
    aria-hidden
    {...p}
  >
    <path d="m8.2 3.5 3.8 3.8 3.8-3.8M3.5 8.2l3.8 3.8-3.8 3.8M20.5 8.2l-3.8 3.8 3.8 3.8M8.2 20.5l3.8-3.8 3.8 3.8" />
    <path d="M12 9.4 14.6 12 12 14.6 9.4 12 12 9.4Z" />
  </svg>
);
