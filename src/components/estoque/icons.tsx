/** Ícones do módulo — mesmo traço Hugeicons do kit (ver ui/icons.tsx). */
import { makeIcon } from "@/components/ui/icons";
import { DropletIcon, HistoryIcon, MinusSignIcon } from "@hugeicons/core-free-icons";

export const IconMinus = makeIcon(MinusSignIcon, "IconMinus");
export const IconDroplet = makeIcon(DropletIcon, "IconDroplet");
export const IconHistory = makeIcon(HistoryIcon, "IconHistory");
